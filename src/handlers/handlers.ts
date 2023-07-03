import {Document, startSession} from "mongoose";
import {GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString} from "graphql";
import {BlogType, CommentType, UserType} from "../schema/schema";
import Blog from "../models/Blog";
import User from "../models/User";
import Comment from "../models/Comment";
import {compareSync, hashSync} from "bcryptjs";

type DocumentType = Document<any, any, any>;

const RootQuery = new GraphQLObjectType({
    name: "RootQuery",
    fields: {
        //     get the all users
        users: {
            type: GraphQLList(UserType),
            async resolve() {
                return User.find();
            }
        },

        // get user by id
        user: {
            type: UserType,
            args: {id: {type: GraphQLNonNull(GraphQLID)}},
            async resolve(parent, {id}) {
                return User.findById(id).populate("blogs");
            }
        },

        // get the all blog
        blogs: {
            type: GraphQLList(BlogType),
            async resolve() {
                return Blog.find();
            }
        },

        // get blog by id
        blog: {
            type: BlogType,
            args: {id: {type: GraphQLNonNull(GraphQLID)}},
            async resolve(parent, {id}) {
                return Blog.findById(id).populate("user comments");
            }
        },

        // get the all comments
        comments: {
            type: GraphQLList(CommentType),
            async resolve() {
                return Comment.find();
            }
        }
    }
});
const mutations = new GraphQLObjectType({
    name: "mutations",
    fields: {
        //     user signup
        signup: {
            type: UserType,
            args: {
                name: {type: GraphQLNonNull(GraphQLString)},
                email: {type: GraphQLNonNull(GraphQLString)},
                password: {type: GraphQLNonNull(GraphQLString)},
            },
            async resolve(parent, {
                name,
                email,
                password
            }) {
                let existingUser: DocumentType;
                try {
                    existingUser = await User.findOne({email});
                    if (existingUser) return new Error("User already exists");
                    const encryptedPassword = hashSync(password);
                    const user = new User({
                        name,
                        email,
                        password: encryptedPassword,
                    });
                    return await user.save();
                } catch (e) {
                    console.log(e);
                    return new Error("User signup failed. Try again");
                }
            },
        },

        //     user login
        login: {
            type: UserType,
            args: {
                email: {type: GraphQLNonNull(GraphQLString)},
                password: {type: GraphQLNonNull(GraphQLString)},
            },
            async resolve(parent, {
                email,
                password
            }) {
                let existingUser: DocumentType;
                try {
                    existingUser = await User.findOne({email});
                    if (!existingUser) return new Error("No User registered with this email");
                    const decryptedPassword = compareSync(
                        password,
                        // @ts-ignore
                        existingUser?.password
                    );
                    if (!decryptedPassword) return new Error("Invalid password");
                    return existingUser;
                } catch (e) {
                    console.log(e);
                    return new Error(e);
                }
            },
        },

        //     add new blog
        addBlog: {
            type: BlogType,
            args: {
                title: {type: GraphQLNonNull(GraphQLString)},
                content: {type: GraphQLNonNull(GraphQLString)},
                date: {type: GraphQLNonNull(GraphQLString)},
                user: {type: GraphQLNonNull(GraphQLID)},
            },
            async resolve(parent, {
                title,
                content,
                date,
                user
            }) {
                let blog: DocumentType;
                const session = await startSession();
                try {
                    session.startTransaction({session});
                    blog = new Blog({
                        title,
                        content,
                        date,
                        user
                    });
                    const existingUser = await User.findById(user);
                    if (!existingUser) return new Error("User not found. Exiting");
                    existingUser.blogs.push(blog);
                    await existingUser.save({session});
                    return await blog.save({session});
                } catch (e) {
                    return new Error(e);
                } finally {
                    await session.commitTransaction();
                }
            }
        },

        //     update existing blog
        updateBlog: {
            type: BlogType,
            args: {
                id: {type: GraphQLNonNull(GraphQLID)},
                title: {type: GraphQLNonNull(GraphQLString)},
                content: {type: GraphQLNonNull(GraphQLString)},
            },
            async resolve(parent, {
                id,
                title,
                content,
            }) {
                let existingBlog: DocumentType;
                try {
                    existingBlog = await Blog.findById(id);
                    if (!existingBlog) return new Error("Blog does not exist");
                    return await Blog.findByIdAndUpdate(id, {
                            title,
                            content,
                        },
                        {new: true}
                    );
                } catch (e) {
                    return new Error(e);
                }
            }
        },

        //     delete existing blog
        deleteBlog: {
            type: BlogType,
            args: {
                id: {type: GraphQLNonNull(GraphQLID)},
            },
            async resolve(parent, {id}) {
                let existingBlog: DocumentType;
                const session = await startSession();
                try {
                    session.startTransaction({session});
                    existingBlog = await Blog.findById(id).populate("user");
                    // @ts-ignore
                    const existingUser = existingBlog?.user;
                    if (!existingUser) return new Error("No user linked to this blog");
                    if (!existingBlog) return new Error("Blog does not exist");
                    existingUser.blogs.pull(existingBlog);
                    await existingUser.save({session});
                    // return await existingBlog.remove({session});
                    return await existingBlog.deleteOne({id: existingBlog.id});
                    // return await Blog.findByIdAndRemove(id);
                } catch (e) {
                    return new Error(e);
                } finally {
                    await session.commitTransaction();
                }
            }
        },

        //     add comments to blog
        addCommentToBlog: {
            type: CommentType,
            args: {
                blog: {type: GraphQLNonNull(GraphQLID)},
                user: {type: GraphQLNonNull(GraphQLID)},
                text: {type: GraphQLNonNull(GraphQLString)},
                date: {type: GraphQLNonNull(GraphQLString)},
            },
            async resolve(parent, {
                user,
                blog,
                text,
                date
            }) {
                const session = await startSession();
                let comment: DocumentType;
                try {
                    session.startTransaction({session});
                    const existingUser = await User.findById(user);
                    const existingBlog = await Blog.findById(blog);
                    if (!existingBlog || !existingBlog) return new Error("User or Blog not found");
                    comment = new Comment({
                        text,
                        date,
                        blog,
                        user,
                    });
                    existingUser.comments.push(comment);
                    existingBlog.comments.push(comment);
                    await existingUser.save({session});
                    await existingBlog.save({session});
                    return await comment.save({session});
                } catch (e) {
                    return new Error(e);
                } finally {
                    await session.commitTransaction();
                }
            }
        },

        //     delete a comment from blog
        deleteComment: {
            type: CommentType,
            args: {
                id: {type: GraphQLNonNull(GraphQLID)},
            },
            async resolve(parent, {id}) {
                let comment: DocumentType;
                const session = await startSession();
                try {
                    session.startTransaction({session});
                    comment = await Comment.findById(id);
                    if (!comment) return new Error("Comment not found");
                    // @ts-ignore
                    const existingUser = await User.findById(comment?.user);
                    if (!existingUser) return new Error("User not found");
                    // @ts-ignore
                    const existingBlog = await Blog.findById(comment?.blog);
                    if (!existingBlog) return new Error("Blog not found");
                    existingUser.comments.pull(comment);
                    existingBlog.comments.pull(comment);
                    await existingUser.save({session});
                    await existingBlog.save({session});
                    // return await comment.remove({session});
                    return await comment.deleteOne({id: comment.id});
                } catch (e) {
                    return new Error(e);
                } finally {
                    await session.commitTransaction();
                }
            }
        }
    }
});

export default new GraphQLSchema({
    query: RootQuery,
    mutation: mutations
});
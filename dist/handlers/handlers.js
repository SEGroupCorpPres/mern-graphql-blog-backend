"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const graphql_1 = require("graphql");
const schema_1 = require("../schema/schema");
const Blog_1 = __importDefault(require("../models/Blog"));
const User_1 = __importDefault(require("../models/User"));
const Comment_1 = __importDefault(require("../models/Comment"));
const bcryptjs_1 = require("bcryptjs");
const RootQuery = new graphql_1.GraphQLObjectType({
    name: "RootQuery",
    fields: {
        //     get the all users
        users: {
            type: (0, graphql_1.GraphQLList)(schema_1.UserType),
            async resolve() {
                return User_1.default.find();
            }
        },
        // get user by id
        user: {
            type: schema_1.UserType,
            args: { id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) } },
            async resolve(parent, { id }) {
                return User_1.default.findById(id).populate("blogs");
            }
        },
        // get the all blog
        blogs: {
            type: (0, graphql_1.GraphQLList)(schema_1.BlogType),
            async resolve() {
                return Blog_1.default.find();
            }
        },
        // get blog by id
        blog: {
            type: schema_1.BlogType,
            args: { id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) } },
            async resolve(parent, { id }) {
                return Blog_1.default.findById(id).populate("user comments");
            }
        },
        // get the all comments
        comments: {
            type: (0, graphql_1.GraphQLList)(schema_1.CommentType),
            async resolve() {
                return Comment_1.default.find();
            }
        }
    }
});
const mutations = new graphql_1.GraphQLObjectType({
    name: "mutations",
    fields: {
        //     user signup
        signup: {
            type: schema_1.UserType,
            args: {
                name: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                email: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                password: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            },
            async resolve(parent, { name, email, password }) {
                let existingUser;
                try {
                    existingUser = await User_1.default.findOne({ email });
                    if (existingUser)
                        return new Error("User already exists");
                    const encryptedPassword = (0, bcryptjs_1.hashSync)(password);
                    const user = new User_1.default({
                        name,
                        email,
                        password: encryptedPassword,
                    });
                    return await user.save();
                }
                catch (e) {
                    console.log(e);
                    return new Error("User signup failed. Try again");
                }
            },
        },
        //     user login
        login: {
            type: schema_1.UserType,
            args: {
                email: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                password: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            },
            async resolve(parent, { email, password }) {
                let existingUser;
                try {
                    existingUser = await User_1.default.findOne({ email });
                    if (!existingUser)
                        return new Error("No User registered with this email");
                    const decryptedPassword = (0, bcryptjs_1.compareSync)(password, 
                    // @ts-ignore
                    existingUser?.password);
                    if (!decryptedPassword)
                        return new Error("Invalid password");
                    return existingUser;
                }
                catch (e) {
                    console.log(e);
                    return new Error(e);
                }
            },
        },
        //     add new blog
        addBlog: {
            type: schema_1.BlogType,
            args: {
                title: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                content: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                date: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                user: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
            },
            async resolve(parent, { title, content, date, user }) {
                let blog;
                const session = await (0, mongoose_1.startSession)();
                try {
                    session.startTransaction({ session });
                    blog = new Blog_1.default({
                        title,
                        content,
                        date,
                        user
                    });
                    const existingUser = await User_1.default.findById(user);
                    if (!existingUser)
                        return new Error("User not found. Exiting");
                    existingUser.blogs.push(blog);
                    await existingUser.save({ session });
                    return await blog.save({ session });
                }
                catch (e) {
                    return new Error(e);
                }
                finally {
                    await session.commitTransaction();
                }
            }
        },
        //     update existing blog
        updateBlog: {
            type: schema_1.BlogType,
            args: {
                id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
                title: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                content: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            },
            async resolve(parent, { id, title, content, }) {
                let existingBlog;
                try {
                    existingBlog = await Blog_1.default.findById(id);
                    if (!existingBlog)
                        return new Error("Blog does not exist");
                    return await Blog_1.default.findByIdAndUpdate(id, {
                        title,
                        content,
                    }, { new: true });
                }
                catch (e) {
                    return new Error(e);
                }
            }
        },
        //     delete existing blog
        deleteBlog: {
            type: schema_1.BlogType,
            args: {
                id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
            },
            async resolve(parent, { id }) {
                let existingBlog;
                const session = await (0, mongoose_1.startSession)();
                try {
                    session.startTransaction({ session });
                    existingBlog = await Blog_1.default.findById(id).populate("user");
                    // @ts-ignore
                    const existingUser = existingBlog?.user;
                    if (!existingUser)
                        return new Error("No user linked to this blog");
                    if (!existingBlog)
                        return new Error("Blog does not exist");
                    existingUser.blogs.pull(existingBlog);
                    await existingUser.save({ session });
                    // return await existingBlog.remove({session});
                    return await existingBlog.deleteOne({ id: existingBlog.id });
                    // return await Blog.findByIdAndRemove(id);
                }
                catch (e) {
                    return new Error(e);
                }
                finally {
                    await session.commitTransaction();
                }
            }
        },
        //     add comments to blog
        addCommentToBlog: {
            type: schema_1.CommentType,
            args: {
                blog: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
                user: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
                text: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
                date: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            },
            async resolve(parent, { user, blog, text, date }) {
                const session = await (0, mongoose_1.startSession)();
                let comment;
                try {
                    session.startTransaction({ session });
                    const existingUser = await User_1.default.findById(user);
                    const existingBlog = await Blog_1.default.findById(blog);
                    if (!existingBlog || !existingBlog)
                        return new Error("User or Blog not found");
                    comment = new Comment_1.default({
                        text,
                        date,
                        blog,
                        user,
                    });
                    existingUser.comments.push(comment);
                    existingBlog.comments.push(comment);
                    await existingUser.save({ session });
                    await existingBlog.save({ session });
                    return await comment.save({ session });
                }
                catch (e) {
                    return new Error(e);
                }
                finally {
                    await session.commitTransaction();
                }
            }
        },
        //     delete a comment from blog
        deleteComment: {
            type: schema_1.CommentType,
            args: {
                id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLID) },
            },
            async resolve(parent, { id }) {
                let comment;
                const session = await (0, mongoose_1.startSession)();
                try {
                    session.startTransaction({ session });
                    comment = await Comment_1.default.findById(id);
                    if (!comment)
                        return new Error("Comment not found");
                    // @ts-ignore
                    const existingUser = await User_1.default.findById(comment?.user);
                    if (!existingUser)
                        return new Error("User not found");
                    // @ts-ignore
                    const existingBlog = await Blog_1.default.findById(comment?.blog);
                    if (!existingBlog)
                        return new Error("Blog not found");
                    existingUser.comments.pull(comment);
                    existingBlog.comments.pull(comment);
                    await existingUser.save({ session });
                    await existingBlog.save({ session });
                    // return await comment.remove({session});
                    return await comment.deleteOne({ id: comment.id });
                }
                catch (e) {
                    return new Error(e);
                }
                finally {
                    await session.commitTransaction();
                }
            }
        }
    }
});
exports.default = new graphql_1.GraphQLSchema({
    query: RootQuery,
    mutation: mutations
});
//# sourceMappingURL=handlers.js.map
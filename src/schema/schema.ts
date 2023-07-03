import {GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString} from "graphql";
import Blog from "../models/Blog";
import Comment from "../models/Comment";
import User from "../models/User";

export const UserType = new GraphQLObjectType({
    name: "UserType",
    fields: () => ({
        id: {type: GraphQLNonNull(GraphQLID)},
        name: {type: GraphQLNonNull(GraphQLString)},
        email: {type: GraphQLNonNull(GraphQLString)},
        password: {type: GraphQLNonNull(GraphQLString)},
        blogs: {
            type: GraphQLList(BlogType),
            async resolve(parent) {
                return Blog.find({user: parent.id});
            }
        },
        comments: {
            type: GraphQLList(CommentType),
            async resolve(parent) {
                return Comment.find({user: parent.id});
            }
        },
    }),
});

export const BlogType = new GraphQLObjectType({
    name: "BlogType",
    fields: () => ({
        id: {type: GraphQLNonNull(GraphQLID)},
        title: {type: GraphQLNonNull(GraphQLString)},
        content: {type: GraphQLNonNull(GraphQLString)},
        date: {type: GraphQLNonNull(GraphQLString)},
        user: {
            type: UserType,
            async resolve(parent) {
                return User.findById(parent.user);
            }
        },
        comments: {
            type: GraphQLList(CommentType),
            async resolve(parent) {
                return Comment.find({blog: parent.id});
            }
        },
    }),
});

export const CommentType = new GraphQLObjectType({
    name: "CommentType",
    fields: () => ({
        id: {type: GraphQLNonNull(GraphQLID)},
        text: {type: GraphQLNonNull(GraphQLString)},
        user: {
            type: UserType,
            async resolve(parent) {
                return User.findById(parent.user);
            }
        },
        blog: {
            type: BlogType,
            async resolve(parent) {
                return Blog.findById(parent.blog);
            }
        },
    }),
});
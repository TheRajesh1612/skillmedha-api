const path = require("path");
// require("dotenv").config({
//   path: path.resolve(__dirname, "../../.env")
// });
require("dotenv").config({
  path: "../../.env",
});

const express = require("express");
const { json, urlencoded } = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const { ApolloServer, gql } = require("apollo-server-express");
const { GraphQLScalarType } = require("graphql");
const GraphQLJSON = require("graphql-type-json");
// const { authenticate } = require("../../tenantUtils/authMiddleware");
// const {authenticate } = require("./../../shared/middleware/auth.middleware");
const { optional: authenticate } = require("./../../shared/middleware/auth.middleware");


const { selectTenantDB } = require("./../../shared/middleware/selectTenantDB.middleware");
// const accessAuth = require("./middlewares/accessAuth");
const axios = require("axios");

const app = express();
app.use(authenticate);

app.use(json(), urlencoded({ extended: false }));
app.use(cors());
app.use((req, res, next) => {
  // Allow unauthenticated GET requests to GraphQL endpoint
  if (req.method === "GET" && req.path === "/") {
    return next();
  }
  return authenticate(req, res, next);
});
app.use((req, res, next) => {
  // Allow unauthenticated GET requests to GraphQL endpoint
  if (req.method === "GET" && req.path === "/") {
    return next();
  }
  return selectTenantDB(req, res, next);
});

const typeDefs = require("./schema/index");
const resolvers = require("./resolvers/index");

const startServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    context: ({ req, res }) => ({
      req, // add req to context
      res, // (optionally add res)
      user: req.user, // ...any other context you want
      tenantDB: req.tenantDB, // example: carry over from previous middleware
    }),
  });
  const cors = {
    credentials: true,
    origin: "*",
  };

  await server.start();
  server.applyMiddleware({ app, path: "/", cors });
};

startServer();

app.listen(1111, () => console.log("graphql server running at port 1111"));

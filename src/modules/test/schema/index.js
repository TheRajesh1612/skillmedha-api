const { gql } = require("apollo-server-express");

const student = require("./student");
const randomStudent = require("./randomStudentss");
const test = require("./test");
const admin = require("./admin");
const instructor = require("./instructor");
const business = require("./business");
const questions = require("./questions");
const category = require("./category");
const language = require("./language");
const progress = require("./progress");
const comprehensionQuestions  = require("./comprehensionQuestions")



module.exports = gql`
  ${student.root}
  ${progress.root}
  ${test.root}
  ${admin.root}
  ${instructor.root}
  ${business.root}
  ${questions.root}
  ${category.root}
  ${language.root}
  ${comprehensionQuestions.root}
  ${randomStudent.root}
 

  ${student.query}
  ${progress.query}
  ${test.query}
  ${admin.query}
  ${instructor.query}
  ${business.query}
  ${questions.query}
  ${category.query}
  ${language.query}
  ${comprehensionQuestions.query}
  ${randomStudent.query}



  union GraphqlUnion = res | err

  type err {
    err: String
  }
  type res {
    msg: String
  }
`;
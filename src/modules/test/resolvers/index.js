
const studentResolver = require("./student");
const testResolver = require("./test");
// const AdminResolver = require("./admin");
// const InstructorResolver = require("./instructor");
// const BusinessResolver = require("./business");
const QuestionsResolver = require("./questions");
const CategoryResolver = require("./category");
const LanguageResolver = require("./languages");
const comprehensionResolver =require("./comprehensionQuestions");
const progressResolver = require("./progress")
// const randomStudentResolver = require("./randomStudents")

const rootResolver = {
  Query: {
    ...studentResolver.Query,
    ...testResolver.Query,
    // ...AdminResolver.Query,
    // ...InstructorResolver.Query,
    // ...BusinessResolver.Query,
    ...QuestionsResolver.Query,
    ...CategoryResolver.Query,
    ...LanguageResolver.Query,
    ...comprehensionResolver.Query,
   ...progressResolver.Query,
  //  ...randomStudentResolver.Query,


  },


  Student: studentResolver.Student,
  Test: testResolver.Test,
  Questions: QuestionsResolver.Questions,
  ComprehensionQuestions: comprehensionResolver.ComprehensionQuestions,
  Progress: progressResolver.Progress,
  // randomStudent : randomStudentResolver.randomStudent,

  GraphqlUnion: {
    __resolveType(obj, context, info) {
      if (obj.msg) {
        return "res";
      }
      if (obj.err) {
        return "err";
      }
      return null;
    },
  },


  StudentUnion: studentResolver.StudentUnion,
  TestUnion : testResolver.TestUnion,
  // AdminUnion : AdminResolver.AdminUnion,
  // InstructorUnion : InstructorResolver.InstructorUnion,
  // BusinessUnion : BusinessResolver.BusinessUnion,
  QuestionsUnion : QuestionsResolver.QuestionsUnion,
  ComprehensionQuestionsUnion : comprehensionResolver.ComprehensionQuestionsUnion,
  ProgressUnion : progressResolver.ProgressUnion,
  // randomStudentUnion : randomStudentResolver.randomStudentUnion,

};

module.exports = rootResolver;
module.exports = {
    root: ` 
    scalar JSON
    
          type ComprehensionQuestions {
            _id: String
            questionType : String
            questionContentArr : [Questions]
            comprehensionText  : String
            sno : String
            questionScore :String
            scoreSettings : JSON
            answer : JSON
            tags : [Category]
            resources  : JSON
          }   
          
    
          union ComprehensionQuestionsUnion = ComprehensionQuestions | err
      `,
  
    query: `
              type Query {
                  ComprehensionQuestions(category: String, questionType : String,cursor: String, limit: Int): [ComprehensionQuestions]
                  ComprehensionQuestion(id: String): ComprehensionQuestionsUnion
              
          }`,

  };
module.exports = {
  root: ` 
    scalar JSON
    
          type Questions {
            _id: String
            questionType : String
            questionContent : JSON
            sno : String
            questionCategory  :[Category]
            questionScore :String
            scoreSettings : JSON
            answer : JSON
            resources  : JSON
          }   
          
    
          union QuestionsUnion = Questions | err
      `,

  query: `
              type Query {
                  questions(category: String, questionType : String,cursor: String, limit: Int): [Questions]
                  question(id: String): QuestionsUnion
              
          }`,
};

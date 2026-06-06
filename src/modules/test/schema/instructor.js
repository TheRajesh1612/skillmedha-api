module.exports = {
    root: ` 
    scalar JSON
    
          type Instructor {
                _id: String
                name : String
                phone : String
                email : String
                password : String
                otp :String
                AccessToken : String
                userType : String
          }   
          
    
          union InstructorUnion = Instructor | err
      `,
  
    query: `
              type Query {
                    instructors: [Instructor]
                    instructor(id: String): AdminUnion
              
          }`,

  };
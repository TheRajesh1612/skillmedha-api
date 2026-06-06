module.exports = {
    root: ` 
    scalar JSON
    
          type Admin {
                _id: String
                name : String
                phone : String
                email : String
                password : String
                gaveAccessTo : [JSON]
                userType : String
          }   
          
    
          union AdminUnion = Admin | err
      `,
  
    query: `
              type Query {
                  admins: [Admin]
                  admin(id: String): AdminUnion
              
          }`,

  };
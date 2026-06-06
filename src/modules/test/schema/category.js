module.exports = {
    root: ` 
    scalar JSON
   

        type Category { 
            _id: String
            type : String
            name: String
        }
      `,
  
    query: `
              type Query {
                  category(type: String): [Category]
              
          }`,

  };
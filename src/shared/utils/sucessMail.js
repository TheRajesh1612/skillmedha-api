const sucessMail = (data) => {
  const time = new Date().toLocaleString();

  var mailOptions = {
    from: "sales@temanedtech.com",
    to: data.email,
    subject: "Your payment has been successful",
    html: `
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link
                href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
                rel="stylesheet">
        
            <style>
                * {
                    font-family: 'Montserrat', sans-serif;
                }
        
                body{
                    width: 100%;
                    height: 100vh;
                }
                div{
                  font-size:1rem;
                  color:black;
                }
                p{
                  font-size:1rem;
                  color:black;

                }
                .container{
                    margin: auto;
                    width: 90%;
                    padding: 1rem;
                    text-align: justify;
        
                }
        
        
                .welcome {
                    width: 100%;
                    font-size:1.1rem;
                    font-weight: 700;

                }
        
        
                .parc {
                    color: #00e9b4;

                }

            </style>
        </head>
        
        <body>
        
           <div class="container">
            <div class="welcome">
              Hi <b> ${data.notes.name} !</b> 
              <br>
              <div>It's pleasure to
                  Welcome you to <span class="parc">Teman Edtech</span> community</div>
              </div>
              <br>

              <div>
              <p>Your course start date is <b>${time} .</b></p>

              Hope you are as thrilled to begin your learning journey as we are.
              </div>
                  <div>Going forward if you have any issue or query around your course or how you can get the best of our services, feel free to contact us.</div>
          
  


           </div>
        

         <br>
         <div>regards : </div>
         <div class="parc">Teman ED-Tech PVT.LTD </div>
        
        </body>
        
        </html>
        `,
  };
  return mailOptions;
};

module.exports = sucessMail;

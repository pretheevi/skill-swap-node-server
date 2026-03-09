const connectDb = require('./db');


connectDb()
.then(database => {
  const db = database;
  const query = 'SELECT * FROM User';
  db.all(query)
    .then(data => console.log(data));
});


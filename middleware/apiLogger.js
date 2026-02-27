function logger(req, res, next){
  const method = req.method;
  const url = req.url;
  const protected = req.headers['authorization']?.split(' ')[1];
  console.debug(`${method}: ${url}, ${protected ? '(protected)': ''}`)
  next();
}

module.exports = logger;
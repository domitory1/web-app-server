function authentificateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token == null) return res.sendStatus(401);

	jwt.verify(token, JWT_KEY, (err, jwt) => {
		if (err){
			console.log(err);
			return res.sendStatus(401)
		};
		if (jwt.type === 'refresh') {
			console.log("TokenNotValidError: jwt is refresh")
			return res.sendStatus(401);
		};
		const JWTInDB = queryDatabase(`SELECT \`JTI\` FROM \`jwt_whitelist\` WHERE \`JTI\` = '${jwt.jti}'`);
		if (JWTInDB === null) return res.sendStatus(401);
		req.jwt = jwt;
		next();
	});
}

module.exports = authentificateToken();
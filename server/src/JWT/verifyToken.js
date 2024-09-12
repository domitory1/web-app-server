const jwt = require('jsonwebtoken');
const { queryDataBase } = require('../DB/connection');

const JWT_KEY = 'FMXF15Uz-m6*P0bVh-5&7Se*nf-ow!HXwbi';

const authentificateToken = (req, res, next) => {
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
		let JWTInDB;
		try {
			JWTInDB = queryDataBase('SELECT JTI FROM jwt_whitelist WHERE JTI = ?', [jwt.jti]);
		} catch (error) {
			console.log('Error selecting to MySQL:', error);
			return res.status(500).json({err: 'Ой. Что-то пошло не так'});
		}
		if (JWTInDB === null) {
			console.log("TokenNotValidError: token is null")
			return res.sendStatus(401)
		};
		req.jwt = jwt;
		next();
	});
}

module.exports = authentificateToken;
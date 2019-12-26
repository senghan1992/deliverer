const jwt = require("jsonwebtoken");
const jwt_config = require("../config/jwt_config");

exports.loginCheck = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  // console.log(req.headers.authorization);

  //토큰이 없을때
  if (!token) {
    console.log("여기로 와야지");
    return res.json({
      code: 401,
      error: "error",
      msg: "로그인 후 이용해주세요"
    });
  }

  // 검증
  jwt.verify(token, jwt_config.jwt_config.secret, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.json({
        code: 400,
        error: err,
        msg: "로그인 후 이용해주세요"
      });
    }
    if (!decoded) {
      return res.json({
        code: 401,
        error: err,
        msg: "로그인 후 이용해주세요"
      });
    }
    // console.log(decoded);
    req.user = decoded.user;
    next();
  });
};

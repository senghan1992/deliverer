var express = require("express");
var router = express.Router();

// controller
const user_controller = require("../controllers/user_controller");

// login check middleware
const check = require("../middleware/login_check");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// new password
router.post("/newpassword", user_controller.newPassword);

router.post("/find/password", user_controller.findPassword);

// 아이디 찾기
router.post("/find/email", user_controller.findEmail);

// 본인인증 callback
router.post("/certificate", check.loginCheck, user_controller.certificate);

// user profile image update
router.put("/:id", check.loginCheck, user_controller.updateUserImage);

// user profile account update
router.put("/account/:id", check.loginCheck, user_controller.updateUserAccount);

// user 정보 가지고 오기 (발송 건수, 운송 건수, 기본 정보)
router.get("/", check.loginCheck, user_controller.getUserInfo);

// 로그인
router.post("/login", user_controller.loginUser);

// 회원 가입
router.post("/regist", user_controller.createUser);

// 오픈 뱅킹 플랫폼 callback url
router.get("/openbanking", (req, res) => {
  // console.log(req.body);
});
router.post("/openbanking", (req, res) => {
  console.log(req.body);
});

/* GET users listing. */
router.get("/", check.loginCheck, function(req, res, next) {
  // console.log(req);
  res.json({
    code: 200,
    user_id: req.user_id
  });
});
module.exports = router;

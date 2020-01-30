const express = require("express");
const router = express.Router();

// controller
const payment_controller = require("../controllers/payment_controller");

// 로그인 체크
const check = require("../middleware/login_check");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 임시 환전
router.post("/tmp-transfer", check.loginCheck, payment_controller.tmpTransfer);

// 환전
router.post("/transfer", check.loginCheck, payment_controller.transfer);

// 결제 수단 삭제
router.delete(
  "/:customer_uid",
  check.loginCheck,
  payment_controller.deleteBillingKey
);

// 유저 payment list 가지고오기
router.get("/", check.loginCheck, payment_controller.getPaymentList);

// 빌링키 저장
router.post("/", check.loginCheck, payment_controller.createBillingKey);

// 입금 이체 call back
router.post("/transit", (req, res) => {});

module.exports = router;

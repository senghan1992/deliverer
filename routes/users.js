var express = require("express");
var router = express.Router();

// login check middleware
const check = require("../middleware/login_check");

// jwt token
const jwt = require("jsonwebtoken");
const jwt_config = require("../config/jwt_config");

// 암호화
const bcrypt = require("bcrypt");
const saltRounds = 10;

//
// db
const { Order, Deliver, User } = require("../models");
const db = require("../models");
const Op = db.Sequelize.Op;

// // AWS
const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

// user 정보 가지고 오기 (발송 건수, 운송 건수, 기본 정보)
router.get("/:id", (req, res) => {
  db.sequelize
    .query(
      `select u.* , COUNT(o.requestId) as orders, COUNT(d.delivererId) as delivers from users as u left join orders as o on u.id = o.requestId left join delivers as d on u.id = d.delivererId group by u.id having u.id = ${req.params.id}`,{type : db.sequelize.QueryTypes.SELECT}
    )
    .then(result => {
      console.log(result);
      res.json({
        code: 200,
        user: result[0]
      });
    });
  // User.findOne({ where: { id: req.params.id } })
  //   .then(result => {
  //     if (result) { 
  //       res.json({
  //         code: 200,
  //         user: result
  //       });
  //     } else {
  //       res.json({
  //         code: 401,
  //         error: "error"
  //       });
  //     }
  //   })
  //   .catch(error => {
  //     res.json({
  //       code: 999,
  //       error,
  //       msg: "시스템 오류"
  //     });
  //   });
});

/* GET users listing. */
router.get("/", check.loginCheck, function(req, res, next) {
  // console.log(req);
  res.json({
    code: 200,
    user_id: req.user_id
  });
});

// 로그인
router.post("/login", (req, res) => {
  let phone = req.body.phone;
  let password = req.body.password;

  User.findOne({ where: { phone: phone } }).then(user_result => {
    if (user_result) {
      bcrypt.compare(password, user_result.password).then(result => {
        if (result) {
          const token = jwt.sign(
            { user: user_result },
            jwt_config.jwt_config.secret,
            { expiresIn: "30 days" }
          );
          res.json({
            code: 200,
            user: user_result,
            token
          });
        } else {
          res.json({
            code: 401,
            msg: "아이디 혹은 비밀번호를 확인해주세요"
          });
        }
      });
    } else {
      res.json({
        code: 404,
        msg: "등록된 유저가 없습니다"
      });
    }
  });
});

// 회원 가입
router.post("/regist", (req, res) => {
  console.log("일단 여기 들어옴");

  let kind = req.body.kind;
  let name = req.body.name;
  let birth = req.body.birth;
  let phone = req.body.phone;
  let gender = req.body.gender;
  let password = req.body.password;
  let bank = req.body.bank; // 의무아님
  let bankNum = req.body.bankNum; // 의무아님
  let agreementMust = req.body.agreementMust;
  let agreementChoice = req.body.agreementChoice;
  let fcm_token = req.body.fcmToken;

  // 암호화 한 비밀번호
  const salt = bcrypt.genSaltSync(saltRounds);
  password = bcrypt.hashSync(password, salt);

  // let profile; // 의무아님

  // // kind 가 0인 경우
  if (kind == "0") {
    // user 전화번호로 가입 되어 있는 아이디 있는지 확인
    User.findOne({ where: { phone: phone } }).then(user_check_result => {
      if (user_check_result) {
        res.json({
          code: 400,
          msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
        });
      } else {
        User.create({
          name,
          birth,
          phone,
          gender,
          password,
          bank,
          bankNum,
          agreementMust,
          agreementChoice,
          fcm_token
        }).then(result => {
          if (result) {
            // 유저 생성 성공하면 jwt token 발행해서 return 해준다
            const token = jwt.sign(
              { user: result },
              jwt_config.jwt_config.secret,
              { expiresIn: "30 days" }
            );
            // console.log(token);
            res.json({
              code: 200,
              user: result,
              token
            });
          } else {
            res.json({
              code: 999,
              msg: "시스템 오류"
            });
          }
        });
      }
    });
  } else if (kind == "1") {
    let profile = req.files.profile;
    console.log(profile);
    // 일단 회원 저장
    // 회원 id 값 나오면 파일 이름 변경해서 aws 저장
    // aws 저장한 파일명 회원 DB 변경
    User.findOne({ where: { phone: phone } }).then(user_check_result => {
      if (user_check_result) {
        res.json({
          code: 400,
          msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
        });
      } else {
        User.create({
          name,
          birth,
          phone,
          gender,
          password,
          bank,
          bankNum,
          agreementMust,
          agreementChoice,
          fcm_token
        }).then(user_result => {
          console.log(user_result.id);
          let filename = `${user_result.id}_${profile.name}.png`;
          const profileUrl =
            "images/profiles/" +
            (new Date().getMonth() + 1) +
            "/" +
            new Date().getDate() +
            "/" +
            filename;
          // aws update
          const S3 = new AWS.S3();
          let param = {
            Bucket: "deliverer.app",
            Key: profileUrl,
            ACL: "public-read",
            Body: profile.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
            ContentType: "image/png" // MIME 타입
          };
          S3.upload(param, (err, data) => {
            if (err)
              res.json({
                code: 999,
                result: false,
                message: err
              });
          });
          ///////////////////////////////////////////
          User.update(
            { profile: profileUrl, updatedAt: new Date() },
            { where: { id: user_result.id } }
          ).then(updateResult => {
            // console.log(result);
            if (updateResult) {
              User.findOne({ where: { id: user_result.id } }).then(result => {
                const token = jwt.sign(
                  { user: result },
                  jwt_config.jwt_config.secret,
                  { expiresIn: "30 days" }
                );
                // console.log(token);
                res.json({
                  code: 200,
                  user: result,
                  token
                });
              });
            } else {
              res.json({
                code: 999,
                msg: "시스템 오류"
              });
            }
          });
        });
      }
    });
  }
});

module.exports = router;

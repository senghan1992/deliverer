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

// 아임포트 설정
const { Iamporter, IamporterError } = require("iamporter");
const iamport_config = require("../config/iamport_config");
const axios = require("axios").default;

// 본인인증 callback
router.post("/certificate", async (req, res) => {
  let imp_uid = req.body.imp_uid;
  try {
    const getToken = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: {
        imp_key: "2586720024990948",
        imp_secret:
          "mwnCrEKHcymVNnX3QUYSPsJaUjuEGac3GAF8eqQqYcmMAjPqeOj3g3eamIP3S26zCMIRcyhbLEXlXNMc"
      }
    });

    const { access_token } = getToken.data.response;

    // imp_uid로 인증 정보 조회
    const getCertifications = await axios({
      url: `https://api.iamport.kr/certifications/${imp_uid}`,
      method: "get",
      headers: { Authorization: access_token }
    }).catch(err => {
      res.json({
        code: -1,
        err
      });
    });

    const certificationsInfo = getCertifications.data.response;
    // console.log(certificationsInfo);

    // return;

    const {
      unique_key,
      unique_in_site,
      name,
      gender,
      birthday
    } = certificationsInfo;

    // // 연령 제한 로직
    // if (new Date(birth).getFullYear() <= 1999) {
    //   // 연령 만족
    // } else {
    //   // 연령 미달
    // }

    // 1인 1계정 허용 로직도 여기서 사용가능
    res.json({
      code: 200,
      data: {
        name: name,
        birth: birthday,
        gender: gender
      }
    });

    // console.log("res.json 나갔다");
  } catch (e) {
    console.error(e);
    res.json({
      code: -1,
      err
    });
  }
});

// user profile image update
router.put("/:id", check.loginCheck, async (req, res) => {
  // console.log("ㅇㅕ기 진입");
  let userId = req.user.id;
  let kind = req.body.kind;

  if (kind == "new") {
    // console.log(req.files);
    let imageUrl = `images/profiles/${new Date().getMonth() +
      1}/${new Date().getDate()}/${req.files.profile.name}`;

    console.log(imageUrl);

    const S3 = new AWS.S3();

    let param = {
      Bucket: "deliverer.app",
      Key: imageUrl,
      ACL: "public-read",
      Body: req.files.profile.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
      ContentType: "image/png" // MIME 타입
    };

    await S3.upload(param, (err, data) => {
      if (err)
        res.json({
          result: false,
          message: err
        });
    });

    db.User.update({ profile: imageUrl }, { where: { id: userId } })
      .then(result => {
        console.log(result);
        res.json({
          code: 200,
          result: imageUrl
        });
      })
      .catch(err => {
        res.json({
          code: 999,
          err
        });
      });
  } else if (kind == "normal") {
    db.User.update({ profile: null }, { where: { id: userId } })
      .then(result => {
        res.json({
          code: 200,
          result
        });
      })
      .catch(err => {
        res.json({
          code: 999,
          err
        });
      });
  } else if (kind == "drop") {
    db.User.update({ status: "F" }, { where: { id: userId } })
      .then(result => {
        res.json({
          code: 200,
          result
        });
      })
      .catch(err => {
        res.json({
          code: 999,
          err
        });
      });
  }
});

// 회원가입시에 계좌 본인 확인하기
router.post("/account", async (req, res) => {
  let bank_code = req.body.bank_code;
  let bank_num = req.body.bank_num;
  let user_name = req.body.user_name;

  // console.log(req.body);

  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });

  const iamportTokenData = await iamporter.getToken();
  const iamportToken = iamportTokenData.data.access_token;
  // console.log(iamportToken);
  const vbanksResult = await axios({
    url: `https://api.iamport.kr/vbanks/holder?bank_code=${bank_code}&bank_num=${bank_num}`,
    headers: {
      Authorization: `Bearer ${iamportToken}`
    }
  }).catch(err => {
    console.log(err);
    res.json({
      code: -1,
      msg: err.response.data.message
    });
  });

  // console.log(vbanksResult.data);
  if (vbanksResult.data.code == 0) {
    // 성공! 유저 이름과 비교
    // console.log(vbanksResult.data);
    let bank_holder = vbanksResult.data.response.bank_holder;
    if (bank_holder == user_name) {
      res.json({
        code: 200,
        data: {
          name: bank_holder
        },
        msg: "등록이 완료되었습니다"
      });
    } else {
      res.json({
        code: -1,
        msg: "본인명의 계좌 등록만 가능합니다"
      });
    }
  }
});

// user profile account update
router.put("/account/:id", check.loginCheck, async (req, res) => {
  let bank_code = req.body.bank_code;
  let bank_num = req.body.bank_num;

  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });

  const iamportTokenData = await iamporter.getToken();
  const iamportToken = iamportTokenData.data.access_token;
  // console.log(iamportToken);
  const vbanksResult = await axios({
    url: `https://api.iamport.kr/vbanks/holder?bank_code=${bank_code}&bank_num=${bank_num}`,
    headers: {
      Authorization: `Bearer ${iamportToken}`
    }
  }).catch(err => {
    console.log(err.response.data.message);
    res.json({
      code: -1,
      msg: err.response.data.message
    });
  });

  // console.log(vbanksResult.data);
  if (vbanksResult.data.code == 0) {
    // 성공! 유저 이름과 비교
    console.log(vbanksResult.data);
    let bank_holder = vbanksResult.data.response.bank_holder;
    if (bank_holder == req.user.name) {
      User.update(
        { bank: bank_code, bankNum: bank_num },
        { where: { id: req.user.id } }
      ).then(result => {
        res.json({
          code: 200,
          data: {
            name: bank_holder
          },
          msg: "등록이 완료되었습니다"
        });
      });
    } else {
      res.json({
        code: -1,
        msg: "본인명의 계좌 등록만 가능합니다"
      });
    }
  }
});

// user 정보 가지고 오기 (발송 건수, 운송 건수, 기본 정보)
router.get("/", check.loginCheck, async (req, res) => {
  await db.User.update(
    { updatedAt: db.sequelize.fn("NOW") },
    { where: { id: req.user.id } }
  );
  db.User.findOne({ where: { id: req.user.id } })
    // db.User.findOne({ where: { id: req.params.id } })
    .then(result => {
      // console.log(result);
      db.sequelize
        .query(
          `select count(*) as count from orders where requestId = ${req.user.id} and status != 'F'`,
          { type: db.sequelize.QueryTypes.SELECT }
        )
        .then(order_result => {
          db.sequelize
            .query(
              `select count(*) as count from delivers where delivererId = ${req.user.id} and status != 'F'`,
              { type: db.sequelize.QueryTypes.SELECT }
            )
            .then(deliver_result => {
              db.Payment.findAll({
                where: { userId: req.user.id },
                order: [["updatedAt", "DESC"]]
              }).then(payment_result => {
                db.CouponUsage.findAll({
                  where: { user_id: req.user.id, is_used: 0 },
                  include: [db.Coupon]
                }).then(coupon_result => {
                  res.json({
                    code: 200,
                    user: result,
                    order_result: order_result[0]["count"],
                    deliver_result: deliver_result[0]["count"],
                    payment_result,
                    coupon_result
                  });
                });
              });
            });
        });
    });
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
      if (user_result.status == "F") {
        res.json({
          code: 600,
          msg: "탈퇴한 회원 고객센터 문의 요망"
        });
      } else {
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
      }
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
        if (user_check_result.status == "A") {
          res.json({
            code: 400,
            msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
          });
        }
        if (user_check_result.status == "D") {
          res.json({
            code: 400,
            msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
          });
        }
        if (user_check_result.status == "F") {
          res.json({
            code: 600,
            msg: "탈퇴한 회원 재가입시 문의 요망"
          });
        }
        return;
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
    // console.log(profile);
    // 일단 회원 저장
    // 회원 id 값 나오면 파일 이름 변경해서 aws 저장
    // aws 저장한 파일명 회원 DB 변경
    User.findOne({ where: { phone: phone } }).then(user_check_result => {
      if (user_check_result) {
        if (user_check_result.status == "A") {
          res.json({
            code: 400,
            msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
          });
        }
        if (user_check_result.status == "D") {
          res.json({
            code: 400,
            msg: "이미 사용중인 전화번호입니다 로그인 해 주세요"
          });
        }
        if (user_check_result.status == "F") {
          res.json({
            code: 600,
            msg: "탈퇴한 회원 재가입시 문의 요망"
          });
        }
        return;
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

// 오픈 뱅킹 플랫폼 callback url
router.post('/openbanking', (req,res) => {
  
});

module.exports = router;

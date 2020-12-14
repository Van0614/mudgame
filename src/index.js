const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptPassword } = require("./util.js");

const { constantManager, mapManager } = require("./datas/Manager");
const { Player } = require("./models/Player");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

mongoose.connect(
  "mongodb+srv://vanessa:actjhj614^^@cluster0.gtu8i.mongodb.net/games?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const authentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return res.sendStatus(401);
  const [bearer, key] = authorization.split(" ");
  if (bearer !== "Bearer") return res.sendStatus(401);
  const player = await Player.findOne({ key });
  if (!player) return res.sendStatus(401);

  req.player = player;
  next();
};

app.get("/", (req, res) => {
  res.render("index", { gameName: constantManager.gameName });
});

app.get("/game", (req, res) => {
  res.render("game");
});

app.post("/signup", async (req, res) => {
  const { id, password, name } = req.body;
  const encryptedPassword = encryptPassword(password);

  if (await Player.exists({ id })) {
    // 새롭게 계정을 만드는 경우.
    return res
      .status(400)
      .send({ error: "Player with same id already exists" });
  } else {
    const player = new Player({
      id,
      password: encryptedPassword,
      name,
      maxHP: 10,
      HP: 10,
      str: 4,
      itemStr: 0,
      def: 4,
      itemDef: 0,
      x: 0,
      y: 0,
      items: [],
      exp: 0,
      level: 1,
      statChangeChance: 5
    });
    await player.save();
    return res.status(200).send({
      success: true,
      message: "Successfully made new user. Please log in."
    });
  }
});

app.post("/stat", async (req, res) => {
  // Change starting stat, deduct change by 1
  const { id, password, str, def, maxHP, final } = req.body;
  const player = await Player.findOne({
    id,
    password: encryptPassword(password)
  });
  if (player.statChangeChance > 0 || final === "true") {
    player.str = str;
    player.def = def;
    player.MaxHp = MaxHP;
    player.Hp = MaxHP;
    player.statChangeChance -= 1;
    if (final === true || final === "true") {
      player.statChangeChance = 0;
    }
    await player.save();
    return res.send({
      success: true,
      message: "changed starting stat",
      chance: player.statChangeChance,
      str: str,
      def: def,
      MaxHP: MaxHP
    });
  } else {
    return res
      .status(400)
      .send({ error: "Chance all used up. Cannot change stat" });
  }
});

app.post("/signin", async (req, res) => {
  const { id, password } = req.body;
  if (await Player.exists({ id, password: encryptPassword(password) })) {
    // TODO: auth 체크
    const key = crypto.randomBytes(24).toString("hex");
    const player = await Player.findOne({
      id,
      password: encryptPassword(password)
    });
    player.key = key;
    await player.save();
    return res.send({ key });
  } else {
    return res
      .status(400)
      .send({ error: "No such player. Wrong id or password" });
  }
});

app.post("/action", authentication, async (req, res) => {
  const { action } = req.body;
  const player = req.player;
  let event = null;
  let field = null;
  let actions = [];
  if (action === "query") {
    field = mapManager.getField(req.player.x, req.player.y);
  } else if (action === "move") {
    const direction = parseInt(req.body.direction, 0); // 0 북. 1 동 . 2 남. 3 서.
    let x = req.player.x;
    let y = req.player.y;
    if (direction === 0) {
      y -= 1;
    } else if (direction === 1) {
      x += 1;
    } else if (direction === 2) {
      y += 1;
    } else if (direction === 3) {
      x -= 1;
    } else {
      res.sendStatus(400);
    }
    field = mapManager.getField(x, y);
    if (!field) res.sendStatus(400);
    player.x = x;
    player.y = y;

    const events = field.events;
    const actions = [];

    // 이벤트를 1) 고르고, 2) 실행한다.
    // 전투시, damageCalculator(공격력, 수비력)=> {감소하는 체력} 함수 활용
    if (events.length > 0) {
      // TODO : 이 부분 통째로 변경
      const _event = events[0];
      if (_event.type === "battle") {
        // TODO: 이벤트 별로 events.json 에서 불러와 이벤트 처리

        event = { description: "늑대와 마주쳐 싸움을 벌였다." };
        player.incrementHP(-1);
      } else if (_event.type === "item") {
        event = { description: "포션을 획득해 체력을 회복했다." };
        player.incrementHP(1);
        player.HP = Math.min(player.maxHP, player.HP + 1);
      }
    }

    // 사망 이벤트 처리
    if (player.HP <= 0) {
      // TODO: 으악 주금!
      player.HP = player.maxHP;
      player.x = 0;
      player.y = 0;
      // TODO: 사망시 랜덤하게 아이템을 잃어버린다.
    }

    await player.save();
  }

  field.canGo.forEach((direction, i) => {
    if (direction === 1)
      actions.push({
        url: "/action",
        text: i,
        params: { direction: i, action: "move" }
      });
  });

  return res.send({ player, field, event, actions });
});

app.listen(3000);

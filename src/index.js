const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const crypto = require("crypto");
const {encryptPassword} = require("./util.js");

const {
  constantManager,
  mapManager,
  monsterManager,
  itemManager,
  eventManager
} = require("./datas/Manager");
const {Player} = require("./models/Player");

const app = express();
app.use(express.urlencoded({extended: true}));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

mongoose.connect(
  "mongodb+srv://vanessa:actjhj614^^@cluster0.gtu8i.mongodb.net/games?retryWrites=true&w=majority",
  {useNewUrlParser: true, useUnifiedTopology: true}
);

const authentication = async (req, res, next) => {
  const {authorization} = req.headers;
  if (!authorization) return res.sendStatus(401);
  const [bearer, key] = authorization.split(" ");
  if (bearer !== "Bearer") return res.sendStatus(401);
  const player = await Player.findOne({key});
  if (!player) return res.sendStatus(401);

  req.player = player;
  next();
};

app.get("/", (req, res) => {
  res.render("index", {gameName: constantManager.gameName});
});

app.get("/game", (req, res) => {
  res.render("game");
});

app.post("/signup", async (req, res) => {
  const {id, password, name} = req.body;
  const encryptedPassword = encryptPassword(password);

  if (await Player.exists({id})) {
    // 새롭게 계정을 만드는 경우.
    return res
      .status(400)
      .send({error: "Player with same id already exists"});
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
      randomPlayerKey: Math.random(),
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
  const {id, password, str, def, hp, final} = req.body;
  const player = await Player.findOne({
    id,
    password: encryptPassword(password)
  });
  if (player.statChangeChance > 0 || final === "true") {
    player.str = str;
    player.def = def;
    player.MaxHp = hp;
    player.Hp = hp;
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
      MaxHP: hp
    });
  } else {
    return res
      .status(400)
      .send({error: "Chance all used up. Cannot change stat"});
  }
});

app.post("/signin", async (req, res) => {
  const {id, password} = req.body;
  if (await Player.exists({id, password: encryptPassword(password)})) {
    // TODO: auth 체크
    const key = crypto.randomBytes(24).toString("hex");
    const player = await Player.findOne({
      id,
      password: encryptPassword(password)
    });
    player.key = key;
    player.randomPlayerKey = Math.random();
    await player.save();
    return res.send({key});
  } else {
    return res
      .status(400)
      .send({error: "No such player. Wrong id or password"});
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

    const event = field.events;

    // 이벤트를 1) 고르고, 2) 실행한다.
    // 전투시, damageCalculator(공격력, 수비력)=> {감소하는 체력} 함수 활용
    if (event !== []) {
      if (event[0].type === "battle") {
        // TODO: 이벤트 별로 events.json 에서 불러와 이벤트 처리
        const monster = event[0].subject;
        const monsterJson = monsterManager.getMonster(monster);

        const attackCalculator = (attackerStr, defenserDef, defenserHP) => {
          if (attackerStr > defenserDef) {
            defenserHP = defenserHP - (attackerStr - defenserDef);
            return defenserHP;
          } else {
            defenserHP--;
            return defenserHP;
          }
        };

        let playerHP = player.hp;
        let monsterHP = monsterJson.hp;

        while (playerHP > player.hp * 0.2) {
          const playerStr = +player.str + player.itemStr;
          const playerDef = +player.def + player.itemDef;

          attackCalculator(playerStr, monsterJson.def, monsterHP);
          attackCalculator(monsterJson.str, playerDef, playerHP);
          if (monsterHP <= 0) {
            player.incrementExp(monsterJson.id);
            break;
          }
        }

        const choice = "continue/run";

        if (choice === "continue") {
          while (playerHP) {
            const playerStr = +player.str + player.itemStr;
            const playerDef = +player.def + player.itemDef;

            attackCalculator(playerStr, monsterJson.def, monsterHP);
            attackCalculator(monsterJson.str, playerDef, playerHP);
            if (monsterHP <= 0) {
              player.incrementExp(monsterJson.id);
              break;
            }

            if (playerHP <= 0) {
              player.HP = player.maxHP;
              player.x = 0;
              player.y = 0;
              await player.save();
              break;
            }
          }
        } else if (choice === "run") {
          console.log("도망갈 곳을 선택하세요.");
        }
      } else if (event[0] === "heal") {
        const healAmount = event[0].subject;
        player.incrementHP(healAmount);
      } else if (event[0] === "item") {
        const item = event[0].subject;

        player.itemToInventory(item);
        const inventoryItemStr = [];
        const inventoryItemDef = [];

        player.items.forEach((e) => {
          const itemJson = itemManager.getItem(e);
          inventoryItemStr.push(itemJson.str);
          inventoryItemDef.push(itemJson.def);
        });

        inventoryItemStr.sort(function (a, b) {
          return a - b;
        });
        const maxStr = inventoryItemStr[inventoryItemStr.length - 1];
        player.itemStr = maxStr;

        inventoryItemDef.sort(function (a, b) {
          return a - b;
        });
        const maxDef = inventoryItemDef[inventoryItemDef.length - 1];
        player.itemDef = maxDef;

        await player.save();
      } else if (event[0] === "none") {
        console.log("아무 일도 일어나지 않았다.");
      }
    }
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


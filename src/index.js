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
  eventManager,
  eventChooser,
  addContinueFight
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
  const {action} = req.body;
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

    // TODO: 만약 이미 전투중인 경우 이 함수를 실행하지 않고 전투를 진행한다!
    const eventJson = eventChooser(player.x, player.y, player.randomPlayerKey);

    if (eventJson) {
      console.log(eventJson.message);

      if (eventJson.event === "battle") {
        // TODO: 이벤트 별로 events.json 에서 불러와 이벤트 처리

        const monster = eventJson.monsterName;
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
        let battleCount = 0;

        let battleStatus = 'fighting'
        while (playerHP > player.hp * 0.2 && battleCount <= 10) {
          const playerStr = player.str + player.itemStr;
          const playerDef = player.def + player.itemDef;

          attackCalculator(playerStr, monsterJson.def, monsterHP);
          attackCalculator(monsterJson.str, playerDef, playerHP);
          battleCount++;

          if (monsterHP <= 0) {
            player.incrementExp(monsterJson.id);
            battleStatus = 'won'
            break;
          }
        }
        if (battleStatus === 'fighting') {
          // TODO addContinueFight 여기에서 함수 사용!
        }

        if (action.choice) {
          if (action.choice === "continue") {
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
                const randomItem = Math.round(Math.random() * 4);
                player.items.splice(randomItem, 1);
                // TODO: 사망시 메세지 등등을 추가해야 하지 않을까?
                await player.save();
                break;
              }
            }

            return console.log("전투결과"); // TODO: response에 포함시키기
          } else if (action.choice === "run") {
            return console.log("도망갈 곳을 선택하세요."); // TODO: response에 포함시키기
          }
        }
      } else if (eventJson.event === "heal") {
        const healAmount = eventJson.healAmount;
        player.incrementHP(healAmount);
      } else if (eventJson.event === "item") {
        const item = eventJson.itemName;

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
      } else if (eventJson.event === "none") {
        console.log("아무 일도 일어나지 않았다.");
      }
    }
  }


  field.canGo.forEach((direction, i) => { // TODO: 전투중이 아닐 때에만 이거 추가하기. 전투중인 경우 이동 불가.
    if (direction === 1)
      actions.push({
        url: "/action",
        text: i,
        params: {direction: i, action: "move"}
      });
  });
  event.monster = {
    name: '해골',
    hp: 3,
    maxHp: 7
  }

  // TODO: event.description 에 여러가지 메세지를 담기. 아니면 배열에 메세지를 여러개 담아도 좋다.
  return res.send({player, field, event, actions});
});

app.listen(3000);


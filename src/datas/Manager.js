const fs = require("fs");

class Manager {
  constructor() {
  }
}

class ConstantManager extends Manager {
  constructor(datas) {
    super();
    this.gameName = datas.gameName;
  }
}

class MapManager extends Manager {
  constructor(datas) {
    super();
    this.id = datas.id;
    this.fields = {};

    datas.fields.forEach((field) => {
      this.fields[`${field[0]}_${field[1]}`] = {
        x: field[0],
        y: field[1],
        description: field[2],
        canGo: field[3],
        events: field[4]
      };
    });
  }

  getField(x, y) {
    return this.fields[`${x}_${y}`];
  }
}

class MonsterManager extends Manager {
  constructor(datas) {
    super();
    this.status = {};

    datas.forEach((data) => {
      this.status[`${data.name}`] = {
        id: data.id,
        name: data.name,
        str: data.str,
        def: data.def,
        hp: data.hp
      };
    })
  }

  getMonster(name) {
    return this.status[name];
  }
}

class ItemManager extends Manager {
  constructor(datas) {
    super();
    this.status = {};

    datas.forEach((data) => {
      this.status[`${data.name}`] = {
        id: data.id,
        name: data.name,
        str: data.str,
        def: data.def,
        hp: data.hp
      };
    })
  }

  getItem(name) {
    return this.status[name];
  }
}

class EventManager extends Manager {
  constructor(datas) {
    super();
    this.status = {};
    this.status[`${datas.type}`] = {
      type: datas.type,
      subject: datas.subject
    };
  }

  getSubject(type) {
    return this.status[type].subject;
  }
}

const constantManager = new ConstantManager(
  JSON.parse(fs.readFileSync(__dirname + "/constants.json"))
);

const mapManager = new MapManager(
  JSON.parse(fs.readFileSync(__dirname + "/map.json"))
);

const monsterManager = new MonsterManager(
  JSON.parse(fs.readFileSync(__dirname + "/monsters.json"))
);

const itemManager = new ItemManager(
  JSON.parse(fs.readFileSync(__dirname + "/items.json"))
);

const eventManager = new EventManager(
  JSON.parse(fs.readFileSync(__dirname + "/events.json"))
);

const battleCalculator = (attack, defense, accuracy = 1) => {
  const random = Math.random()
  if (random < accuracy) {
    return 0
  } else {
    if (attack - defense > 0) {
      return attack - defense
    } else {
      return 1
    }
  }
}

const eventChooser = (x, y, randomKey) => {  // Todo: randomkey는 player.randomKey
  // TODO: 맵은 0~10으로 가정하고, 5,5에 가까워질수록 강한 보상과 맵이 나온다.
  const messages = [ // 가장자리부터 중심부까지 순서대로 메세지 출력
    '평화롭다.',
    '약간 긴장된다.',
    '스산하다.',
    '기운이 어둡다.',
    '매우 어두운 기운이다.',
    '두려워 미칠 것 같다.',
  ]
  const playerSeed = randomKey.toString().slice(2)
  const placeSeed = parseInt(playerSeed[((11 * x) + y) % 16]) // 0~9 사이의 숫자
  const distanceFromCenter = Math.max((5 - x) * Math.sign(5 - x), (5 - y) * Math.sign(5 - y))

  //item, monster 정보 모두 불러온다.
  const distanceMonster = JSON.parse(fs.readFileSync(__dirname + "/monsters.json"));
  const distanceItems = JSON.parse(fs.readFileSync(__dirname + "/items.json"));

  let response = {
    event: 'none', // none 70%, battle 10%, item 10%, heal 10%
    message: '',
    monsterName: '',
    itemName: '',
    healAmount: 0
    // TODO: 여기에 소환된 몬스터의 능력치나, 얻은 아이템의 능력치, 회복량 등을 잘 담으면 된다. 자료 형식이 결정되면 다른 조원들이게 알려주자
  }
  if (placeSeed < 7) {
    response.event = 'none'
    response.message = messages[5 - distanceFromCenter]

  } else if (placeSeed < 8) {
    response.event = 'battle'
    response.message = '몬스터가 싸움을 걸어왔다'
    response.monsterName = distanceMonster[5 - distanceFromCenter].name;

  } else if (placeSeed < 9) {
    response.event = 'item'
    response.itemName = distanceItems[5 - distanceFromCenter].name;

  } else {
    response.event = 'heal'
    response.message = messages[5 - distanceFromCenter] + ' 누군가 음식을 두고 갔다.'
    response.healAmount = 7 - distanceFromCenter;
  }

  return response
}

const addContinueFight = (actions, text, booleanValue) => {
  actions.push({
    url: "/action",
    text: text,
    params: {continue: booleanValue}
  });
};


module.exports = {
  constantManager,
  mapManager,
  monsterManager,
  itemManager,
  eventManager,
  eventChooser,
  addContinueFight
};

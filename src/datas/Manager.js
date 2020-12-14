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

    this.status[`${datas.name}`] = {
      id: datas.id,
      name: datas.name,
      str: datas.str,
      def: datas.def,
      hp: datas.hp
    };
  }

  getMonster(name) {
    return this.status[name];
  }
}

class ItemManager extends Manager {
  constructor(datas) {
    super();
    this.status = {};

    this.status[`${datas.name}`] = {
      id: datas.id,
      name: datas.name,
      str: datas.str,
      def: datas.def,
      hp: datas.hp
    };
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

module.exports = {
  constantManager,
  mapManager,
  monsterManager,
  itemManager,
  eventManager
};

let fs = require('fs')
let entities = {}

function objectSet(player, obj) {
  obj = JSON.parse(obj)
  entities[obj.id] = obj
}

function toFixed(obj) {
  obj.x = parseFloat(obj.x.toFixed(4))
  obj.y = parseFloat(obj.y.toFixed(4))
  obj.z = parseFloat(obj.z.toFixed(4))
}

function saveMap(file, name, author, gamemode, desc) {
  let obj = {
    meta: {
      name, author, gamemode,
      description: desc
    }
  }
  for (let key in entities) {
    let ent = entities[key]
    if (!obj[ent.type+'s'])
      obj[ent.type+'s'] = []
    let _ent = {}
    _ent.model = ent.model
    toFixed(ent.position)
    _ent.pos = ent.position
    if (ent.type != 'marker') {
      toFixed(ent.rotation)
      _ent.rot = ent.rotation
    }
    obj[ent.type+'s'].push('/'+JSON.stringify(_ent)+'/')
  }

  let data = JSON.stringify(obj, null, 1)
  data = data.replace(/(s*"\/)|\/"|\\/g, '')
  fs.writeFileSync(`./maps/${file}.json`, data)
}

mp.events.add({
  'me:upsertEntity': objectSet,

  'me:deleteObject': (player, id)=> {
    delete entities[id]
  },

  'me:checkFileExists': (player, file)=> {
    let exist = fs.existsSync('./maps/'+file+'.json')
    player.call('me:checkFileResult', [exist])
  },

  'me:saveMap': (player, file, name, author, gamemode, desc)=> {
    if (!name)
      name = 'Unnamed'
    if (!author)
      name = 'Unkown'
    saveMap(file, name, author, gamemode, desc)
    player.notify('~g~Map saved')
  }
})
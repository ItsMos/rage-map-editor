let entities = {}

function objectSet(player, obj) {
  obj = JSON.parse(obj)
  entities[obj.id] = obj
}

mp.events.add({
  'me:placeObject': objectSet,
  'me:updateObject': objectSet,

  'me:deleteObject': (player, id)=> {
    delete entities[id]
  }
})
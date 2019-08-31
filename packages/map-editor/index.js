let entities = {}

mp.events.add({
  'me:placeObject': (player, obj)=> {
    obj = JSON.parse(obj)
    entities[obj.id] = obj
  },

  'me:updateObject': (player, obj)=> {
    obj = JSON.parse(obj)
    entities[obj.id] = obj
  },

  'me:deleteObject': (player, id)=> {
    delete entities[id]
    console.log('deleted ' + id, typeof  id)
  }
})
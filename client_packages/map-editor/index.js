let noclip = require('./map-editor/noclip'),
  player = mp.players.local,
  entities = {},
  isWriting = false;

function generateId() {
  let i = 0
  while (true) {
    if (entities[i] == null)
      return i
    i++
  }
  return false
}

function inFrontOf (pos, heading, dist) {
  heading *= Math.PI / 180
  pos.x += (dist * Math.sin(-heading))
  pos.y += (dist * Math.cos(-heading))
  return pos
}

function showCrosshair(show, isHoldingObject) {
  cef.execute(`app.crosshair = ${show}`)
  if (isHoldingObject != null)
    cef.execute(`app.isHoldingObject = ${isHoldingObject}`)
}

function hitTest() {
  let camPos = noClipCamera.getCoord()
  let camDir = noClipCamera.getDirection()
  let pos2 = new mp.Vector3((camDir.x * 200) + (camPos.x), (camDir.y * 200) + (camPos.y), (camDir.z * 200) + (camPos.z))
  let r = mp.raycasting.testPointToPoint(camPos,pos2)
  if (r) {
    if (isNaN(r.entity)) {
      return r.entity
    } else {
      // world entity handle
      return false
    }
  }
  return false
}

let keys = {
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  PageUp: 33,
  PageDown: 34,
  Delete: 46,
  C: 67,
  E: 69,
  Q: 81,
  F: 70,
  LCtrl: 17,
  Alt: 18,
  Shift: 16,
  F3: 114,
  F5: 116
}

mp.keys.bind(keys.F, true, function() {
  if (mp.gui.cursor.visible && !isWriting) {
    mp.gui.cursor.show(false, false)
    showCrosshair(true)
  }
  else {
    mp.gui.cursor.show(true, true)
    showCrosshair(false)
  }
})

let tempObject
// entity props window
mp.keys.bind(keys.F3, true, ()=> {
  if (!selectedObject || tempObject) return
  // if (selectedObject.type == 'object') {
  //   tempObject = createEntity(selectedObject.name, selectedObject.position)
  //   tempObject.setVisible(false, true)
  //   cef.execute(`app.window = 'object'`)
  // }
  // if (selectedObject.type == 'marker') {
  //   tempObject = createEntity('marker', selectedObject.position)
  //   tempObject.visible = false
  //   cef.execute(`app.window = 'marker'`)
  // }
})

function generateEntityList() {
  let list = {}
  for (let id in entities) {
    list[id] = {id: id, type: entities[id].type}
    if (entities[id].model)
      list[id].model = entities[id].model
    if (entities[id].name)
      list[id].name = entities[id].name
  }
  return list
}

mp.keys.bind(keys.F5, true, ()=> {
  let entities = generateEntityList()
  cef.execute(`
    if (app.window == null) {
      app.entities = ${JSON.stringify(entities)}
      app.windowOpen('entities')
    } else if (app.window == 'entities') {
      app.window = null
      app.entities = {}
    }
  `)
})

mp.keys.bind(keys.Delete, true, ()=> {
  if (selectedObject) {
    let id = selectedObject._id
    deselectObject()
    entities[id].destroy()
    mp.events.callRemote('me:deleteObject', id)
    cef.execute(`Vue.delete(app.entities, ${id})`)
    delete entities[id]
  }
})

mp.keys.bind(keys.C, true, ()=> {
  if (mp.keys.isDown(keys.LCtrl)) {
    if (!selectedObject) return
    let name
    if (selectedObject.type == 'marker')
      name = 'marker'
    else name = selectedObject.name
    viewedObject = createEntity(name, selectedObject.position)
    viewedObject.rotation = selectedObject.rotation
    syncEntity(selectedObject)
    deselectObject()
    mp.events.call('me:createObject')
    mp.game.graphics.notify('~g~Object copied!')
  }
})

// select, deselect entities
mp.events.add('click', (x,y,upOrDown,leftOrRight,relativeX,relativeY,worldPos, hitEntity)=> {
  if (!noClipCamera) return
  if (mp.gui.cursor.visible) return
  if (leftOrRight == 'left' && upOrDown == 'down') {
    // if modifying entity props in CEF, dont deselect
    if (tempObject) return
    let hit = hitTest()
    if (selectedObject)
      syncEntity(selectedObject)
    
    if (!hit) {
      if (selectedObject) {
        deselectObject()
      }
    } else {
      if (selectedObject == hit || viewedObject == hit)
        return
      selectedObject = hit
      selectObject()
      motionRender = new mp.Event('render', moveObject)
    }
  }
})

let cef
let selectedObject, viewedObject;

let boxRender, boxMarker, motionRender;

function selectObject(obj) {
  obj = obj ? obj: selectedObject
  showCrosshair(true,true)
  // draw box
  if (boxMarker) boxMarker.destroy()
  if (boxRender) boxRender.destroy()
  let pos = obj.position
  let dim = mp.game.gameplay.getModelDimensions(obj.model)
  let min = new mp.Vector3(dim.min.x, dim.min.y, dim.min.z)
  let max = new mp.Vector3(dim.max.x, dim.max.y, dim.max.z)
  let size = max.subtract(min)

  boxMarker = mp.markers.new(0, new mp.Vector3(pos.x,pos.y,pos.z + size.z+4),1, {
    color: [255,255,0,255]
  })

  boxRender = new mp.Event('render', ()=> {
    pos = obj.position
    boxMarker.position = new mp.Vector3(pos.x,pos.y,pos.z + size.z+4)

    let v1 = new mp.Vector3(pos.x, pos.y, pos.z)
    v1.x += (size.x/2)
    v1.y += (size.y/2)
    let v2 = new mp.Vector3(pos.x, pos.y, pos.z + size.z)
    v2.x -= (size.x/2)
    v2.y -= (size.y/2)
    mp.game.graphics.drawBox(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z,0,0,255,50)
  })
}
function deselectObject() {
  if (boxRender)
    boxRender.destroy()
  if (boxMarker)
    boxMarker.destroy()
  if (motionRender)
    motionRender.destroy()
  boxRender = boxMarker = motionRender = null
  selectedObject = null
  showCrosshair(true, false)
}

// render function
function moveObject() {
  if (mp.gui.cursor.visible) return
  let UpDownSign = 0, RLSign = 0
  zSign = 0, speed = 0.40

  if (mp.keys.isDown(keys.Alt))
    speed = 0.025
  if (mp.keys.isDown(keys.Shift))
    speed = 1.25
  
  if (mp.keys.isDown(keys.Up))
    UpDownSign = 1
  if (mp.keys.isDown(keys.Down))
    UpDownSign = -1
  if (mp.keys.isDown(keys.Right))
    RLSign = 1
  if (mp.keys.isDown(keys.Left))
    RLSign = -1
  if (mp.keys.isDown(keys.PageUp))
    zSign = 1
  if (mp.keys.isDown(keys.PageDown))
    zSign = -1
  
  // rotation control
  if (mp.keys.isDown(keys.LCtrl)) {
    if (selectedObject.type == 'marker') return
    if (selectedObject.type == 'vehicle') return
    // zSign = X rot, RLSign = Z rot, UpDownSign = Y rot
    let rot = selectedObject.rotation,
    x = (rot.x + (zSign * speed)) % 360,
    y = (rot.y + (UpDownSign * speed)) % 360,
    z = (rot.z + (RLSign * speed)) % 360
    selectedObject.rotation = new mp.Vector3(x, y, z)

  } else {
    // position control
    let pos = selectedObject.position
    let camDir = noClipCamera.getDirection()
    let rightVec = new mp.Vector3(camDir.y,  -camDir.x, 0)
    rightVec = new mp.Vector3(
      rightVec.x * (RLSign * speed),
      rightVec.y * (RLSign * speed),
      0)
    camDir = new mp.Vector3(
      camDir.x * (UpDownSign * speed),
      camDir.y * (UpDownSign * speed),
      0)
    selectedObject.position = new mp.Vector3(pos.x+camDir.x + rightVec.x,pos.y+camDir.y + rightVec.y, pos.z + (speed * zSign))
  }

}

function createEntity(entity, pos) {
  if (entity == 'marker')
    return mp.markers.new(0, new mp.Vector3(pos.x,pos.y,pos.z),1)
  
  let model = isNaN(entity)? mp.game.joaat(entity) : parseInt(entity)
  
  let obj = mp.objects.new(model, pos, {
    rotation: new mp.Vector3(0,0,0),
    dimension: player.dimension
  })
  obj.name = entity
  return obj
}

function syncEntity(ent) {
  if (ent._id == null) return
  let obj = {
    id: ent._id,
    type: ent.type,
    model: ent.name? ent.name : ent.model,
    position: ent.position,
    rotation: ent.rotation
  }
  mp.events.callRemote('me:upsertEntity', JSON.stringify(obj))
}

mp.events.add({
  'me:start': ()=> {
    if (cef) return
    noclip.start()
    cef = mp.browsers.new('package://map-editor/ui/ui.html')
    let objectsList = require('./map-editor/objects').list
    objectsList = objectsList.map(obj=> {
      return { obj: obj}
    })
    cef.execute(`app.updateObjectsList(${JSON.stringify(objectsList)})`)
    mp.game.ui.displayRadar(false)
    mp.gui.chat.push('Map Editor started')
  },

  'me:stop': ()=> {
    if (cef) {
      cef.destroy()
      cef = null
    }
    noclip.stop()
  }
})

// CEF Events
mp.events.add({
  'me:viewObject': object=>{
    let pos
    if (viewedObject) {
      pos = viewedObject.position
      viewedObject.destroy()
    } else {
      pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
      pos.z += noClipCamera.getDirection().z * 10
    }
    viewedObject = createEntity(object, pos)
  },
  'me:createMarker': ()=> {
    let pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
    pos.z += noClipCamera.getDirection().z * 10
    let m = createEntity('marker', pos)
    m._id = generateId()
    entities[m._id] = m
    syncEntity(m)
  },
  'me:createObject': ()=> {
    if (!viewedObject) return
    // draw a box/light around the object and control it with keyboard
    selectedObject = viewedObject
    mp.gui.cursor.visible = false
    selectObject()
    // enable object movement
    motionRender = new mp.Event('render', moveObject)
    selectedObject._id = generateId()
    syncEntity(selectedObject)
    entities[selectedObject._id] = selectedObject
    viewedObject = null
  },
  'me:cancelObjectView': ()=> {
    if (viewedObject) {
      viewedObject.destroy()
      viewedObject = null
    }
  },
  'me:selectEntity': (id)=> {
    deselectObject()
    selectedObject = entities[id]
    selectObject()
    motionRender = new mp.Event('render', moveObject)
    let pos = inFrontOf(selectedObject.position, 0, 10)
    noClipCamera.setCoord(pos.x,pos.y,pos.z)
    // markers dont have .handle
    if (selectedObject.type != 'marker') {
      noClipCamera.pointAt(selectedObject.handle, 0,0,0,true)
      setTimeout(()=> {
        noClipCamera.stopPointing()
      }, 500)
    }
  },

  'me:checkFileExists': file=> mp.events.callRemote('me:checkFileExists', file),
  'me:checkFileResult': exist=> {
    cef.execute(`app.fileExists = ${exist}`)
    if (!exist)
      cef.execute(`app.saveMap()`)
  },
  'me:saveMap': (file, name, author, gamemode, desc)=> {
    mp.events.callRemote('me:saveMap', file, name, author, gamemode, desc)
  },
  'me:newMap': ()=> {
    deselectObject()
    for (let id in entities)
      entities[id].destroy()
    entities = {}
    mp.events.callRemote('me:newMap')
    mp.game.graphics.notify('~y~New map started')
  },
  'me:getMaps': ()=> mp.events.callRemote('me:getMaps'),
  'me:gotMaps': (maps)=>
    cef.execute(`app.reciveMaps(${JSON.stringify(maps)})`),
  'me:openMap': map=> {
    mp.events.call('me:newMap')
    openingMapFile = map
    mp.events.callRemote('me:openMap', map)
  },

  'me:streamMapChunks': mapChunksOnStream,

  // true when an html 'input' is in focus
  'me:isWriting': writing=> {
    if (writing) {
      mp.gui.chat.activate(false)
      isWriting = true
    } else {
      mp.gui.chat.activate(true)
      isWriting = false
    }
  }

})

let openingMapFile = ''
let buffer = ''
function mapChunksOnStream(chunk, eos) {
  buffer += chunk
  // end of stream
  if (eos) {
    let map = JSON.parse(buffer)
    buffer = ''
    
    let types = ['objects', 'markers', 'vehicles']
    types.forEach(type=> {
      if (!map[type]) return false

      map[type].forEach(ent=> {
        let _ent = {}
        if (type == 'markers')
          _ent = createEntity('marker', ent.pos)
        else
          _ent = createEntity(ent.model, ent.pos)
        if (ent.rot)
          _ent.rotation = ent.rot
        _ent._id = generateId()
        entities[_ent._id] = _ent
        syncEntity(_ent)
      })
    })

    if (!map.meta)
      map.meta = {}
    if (!map.meta.name)
      map.meta.name = 'Unnamed'
    if (!map.meta.author)
      map.meta.author = 'Unkown'
    if (!map.meta.gamemode)
      map.meta.gamemode = ''
    if (!map.meta.description)
      map.meta.description = ''

    // escape ' and " with \
    cef.execute(`
      app.$set(app.map, 'file', '${openingMapFile}')
      app.savedFile = '${openingMapFile}'
      app.$set(app.map, 'name', '${map.meta.name.replace(/"/g, "\\\"").replace(/\'/g, "\\\'")}')
      app.$set(app.map, 'author', '${map.meta.author.replace(/"/g, "\\\"").replace(/\'/g, "\\\'")}')
      app.$set(app.map, 'gamemode', '${map.meta.gamemode.replace(/"/g, "\\\"").replace(/\'/g, "\\\'")}')
      app.$set(app.map, 'desc', '${map.meta.description.replace(/"/g, "\\\"").replace(/\'/g, "\\\'")}')
    `)
    mp.game.graphics.notify('Map opened ' + openingMapFile)
  }
}

for (let i = 1; i < 4; i++)
  mp.game.ui.removeNotification(i)

setTimeout(() => {
  mp.events.call('me:start')
}, 2000)

// for tests
global.ME = {
  hitTest,
  cef,
  entities
}
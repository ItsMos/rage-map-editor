let noclip = require('./map-editor/noclip')
let player = mp.players.local
let entities = {}

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

let keysHex = {
  F2: 0x71,
  F3: 0x72,
  F5: 0x74,
  Delete: 0x2E
}
let keys = {
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  PageUp: 33,
  PageDown: 34,
  E: 69,
  Q: 81,
  LCtrl: 17,
  Alt: 18,
  Shift: 16
}

mp.keys.bind(keysHex.F2, true, function() {
  if (mp.gui.cursor.visible) {
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
mp.keys.bind(keysHex.F3, true, ()=> {
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

mp.keys.bind(keysHex.F5, true, ()=> {
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

mp.keys.bind(keysHex.Delete, true, ()=> {
  if (selectedObject) {
    let id = selectedObject.id
    deselectObject()
    entities[id].destroy()
    mp.events.callRemote('me:deleteObject', id)
    cef.execute(`Vue.delete(app.entities, ${id})`)
    delete entities[id]
  }
})

// select, deselect entities
mp.events.add('click', (x,y,upOrDown,leftOrRight,relativeX,relativeY,worldPos, hitEntity)=> {
  if (mp.gui.cursor.visible)
    return
  if (leftOrRight == 'left' && upOrDown == 'down') {
    // if modifying entity props in CEF, dont deselect
    if (tempObject) return
    let hit = hitTest()
    if (!hit) {
      if (selectedObject) {
        let obj = {
          id: selectedObject._id,
          type: selectedObject.type,
          model: selectedObject.name? selectedObject.name : selectedObject.model,
          position: selectedObject.position,
          rotation: selectedObject.rotation
        }
        mp.events.callRemote('me:updateObject', JSON.stringify(obj))
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

  boxMarker = mp.markers.new(0, new mp.Vector3(pos.x,pos.y,pos.z + size.z+1),1)

  boxRender = new mp.Event('render', ()=> {
    pos = obj.position
    boxMarker.position = new mp.Vector3(pos.x,pos.y,pos.z + size.z+1)

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
  zSign = 0, speed = 0.70

  if (mp.keys.isDown(keys.Alt))
    speed = 0.25
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

function createEntity(entity, pos, name) {
  if (entity == 'marker')
    return mp.markers.new(0, new mp.Vector3(pos.x,pos.y,pos.z),1)
  
  let obj = mp.objects.new(mp.game.joaat(entity), pos, {
    rotation: new mp.Vector3(0,0,0),
    dimension: player.dimension
  })
  obj.name = entity
  return obj
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
  },
  'me:createObject': ()=> {
    if (!viewedObject) return
    // draw a box/light around the object and control it with keyboard
    selectedObject = viewedObject
    mp.gui.cursor.visible = false
    selectObject()
    // enable object movement
    motionRender = new mp.Event('render', moveObject)
    let obj = {
      id: generateId(),
      type: viewedObject.type,
      model: viewedObject.model,
      name: viewedObject.name,
      position: viewedObject.position,
      rotation: viewedObject.rotation
    }
    selectedObject._id = obj.id
    entities[obj.id] = selectedObject
    mp.events.callRemote('me:placeObject', JSON.stringify(obj))
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
  }

})

setTimeout(() => {
  mp.events.call('me:start')
}, 2000)

// for tests
global.ME = {
  hitTest,
  cef,
  entities
}
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

function generateEntityList() {
  let list = {}
  for (let id in entities) {
    list[id] = {id: id, type: entities[id].type}
    if (entities[id].model)
      list[id].model = entities[id].model
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

mp.events.add('click', (x,y,upOrDown,leftOrRight,relativeX,relativeY,worldPos, hitEntity)=> {
  if (mp.gui.cursor.visible)
    return
  if (leftOrRight == 'left' && upOrDown == 'down') {
    let hit = hitTest()
    if (!hit) {
      if (selectedObject) {
        let obj = {
          id: selectedObject.id,
          model: selectedObject.model,
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
  let UpDownSign = 0
  let RLSign = 0
  let zSign = 0
  let dist = 0.70
  if (mp.keys.isDown(keys.Alt))
    dist = 0.25
  if (mp.keys.isDown(keys.Shift))
    dist = 1.25
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

  let pos = selectedObject.position
  let camDir = noClipCamera.getDirection()
  let rightVec = new mp.Vector3(camDir.y,  -camDir.x, 0)
  rightVec = new mp.Vector3(
    rightVec.x * (RLSign * dist),
    rightVec.y * (RLSign * dist),
    0)
  camDir = new mp.Vector3(
    camDir.x * (UpDownSign * dist),
    camDir.y * (UpDownSign * dist),
    0)
  selectedObject.position = new mp.Vector3(pos.x+camDir.x + rightVec.x,pos.y+camDir.y + rightVec.y, pos.z + (dist * zSign))
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
    
    viewedObject = mp.objects.new(mp.game.joaat(object), pos, {
      rotation: new mp.Vector3(0,0,0),
      dimension: player.dimension
    })
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
      model: viewedObject.model,
      position: viewedObject.position,
      rotation: viewedObject.rotation
    }
    selectedObject.id = obj.id
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
    noClipCamera.pointAt(selectedObject.handle, 0,0,0,true)
    setTimeout(()=> {
      noClipCamera.stopPointing()
    }, 500)
  },
  'me:createMarker': ()=>{},

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
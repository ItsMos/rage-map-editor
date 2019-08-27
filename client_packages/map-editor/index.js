let noclip = require('./map-editor/noclip')
let player = mp.players.local

function inFrontOf (pos, heading, dist) {
  heading *= Math.PI / 180
  pos.x += (dist * Math.sin(-heading))
  pos.y += (dist * Math.cos(-heading))
  return pos
}

let cef

mp.events.add({
  'me:start': ()=> {
    if (cef) return
    noclip.start()
    cef = mp.browsers.new('package://map-editor/ui/ui.html')
    let objectsList = require('./map-editor/objects').list
    objectsList = Object.keys(objectsList).map(function(key) {
      return { obj: key}
    })
    cef.execute(`app.updateObjectsList(${JSON.stringify(objectsList)})`)
    mp.game.ui.displayRadar(false)
    mp.gui.chat.push('Map editor started')
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
  'me:viewObject': ()=>{},
  'me:viewMarker': ()=>{},
  'me:placeObject': (object, pos, rotation) => {
    let _pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
    mp.objects.new(mp.game.joaat(object), _pos, {
      rotation: new mp.Vector3(0,0,0),
      dimension: player.dimension
    })
  }
})

setTimeout(() => {
  mp.events.call('me:start')
  mp.gui.chat.push('type '+typeof(noClipCamera))
}, 2000)
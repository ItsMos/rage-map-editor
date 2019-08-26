let noclip = require('./map-editor/noclip')

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
    mp.game.graphics.notify('loaded ' + Object.keys(objectsList).length + ' objects')
    cef.execute(`app.list = ${JSON.stringify(objectsList)}`)
    mp.game.ui.displayRadar(false)
    mp.gui.chat.push('map editor started')
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
  'me:createObject': object=> {
    let pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
    mp.objects.new(mp.game.joaat(object), pos, {
      rotation: new mp.Vector3(0,0,0),
      dimension: player.dimension
    })
  }
})

setTimeout(() => {
  mp.events.call('me:start')
  mp.gui.chat.push('type '+typeof(noClipCamera))
}, 5000)
ServerEvents.recipes(event => {
  event.remove({ output: '#waystones:waystones' })
  event.remove({ output: '#waystones:sharestones' })
  event.remove({ output: '#waystones:portstones' })
  event.remove({ output: '#waystones:warp_stones' })

  event.remove({ output: 'waystones:warp_plate' })
  event.remove({ output: 'waystones:warp_scroll' })
  event.remove({ output: 'waystones:return_scroll' })
  event.remove({ output: 'waystones:blank_scroll' })
})
// These are all the recipe changes for the Reimagined Modpack. They'll be categorized by group.

// Opening recipe commands.

ServerEvents.recipes(event => {

// Shulker recipe

event.shaped(
  Item.of('minecraft:shulker_shell'), // arg 1: output
  [
    'A A',
    'B B', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'create:iron_sheet',
	B: 'farmersdelight:canvas'
  }
)

// Silver Swap

event.replaceInput(
  { input: 'galosphere:palladium_ingot' }, // Arg 1: the filter
  'galosphere:palladium_ingot',            // Arg 2: the item to replace
  'caverns_and_chasms:silver_ingot'         // Arg 3: the item to replace it with
  // Note: tagged fluid ingredients do not work on Fabric, but tagged items do.
)

event.replaceInput(
  { input: 'galosphere:palladium_nugget' }, // Arg 1: the filter
  'galosphere:palladium_nugget',            // Arg 2: the item to replace
  'caverns_and_chasms:silver_nugget'         // Arg 3: the item to replace it with
  // Note: tagged fluid ingredients do not work on Fabric, but tagged items do.
)


event.replaceOutput(
  { output: 'create:dough' }, // Arg 1: the filter
  'create:dough',            // Arg 2: the item to replace
  'farmersdelight:wheat_dough'         // Arg 3: the item to replace it with
  // Note: tagged fluid ingredients do not work on Fabric, but tagged items do.
)

// Templates

event.shaped(
  Item.of('minecraft:netherite_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:blaze_powder'
  }
)

event.shaped(
  Item.of('betterend:aeternium_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'betterend:ender_dust'
  }
)

event.shaped(
  Item.of('betterend:plate_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'betterend:ender_shard'
  }
)

event.shaped(
  Item.of('betterend:netherite_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:blaze_rod'
  }
)

event.shaped(
  Item.of('betterend:terminite_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'betterend:terminite_ingot'
  }
)

event.shaped(
  Item.of('betterend:thallasium_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'betterend:thallasium_ingot'
  }
)

event.shaped(
  Item.of('betternether:cincinnasite_diamond_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:glowstone_dust'
  }
)

event.shaped(
  Item.of('betternether:flaming_ruby_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:fire_charge'
  }
)

event.shaped(
  Item.of('cataclysm:cursium_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:spider_eye'
  }
)

event.shaped(
  Item.of('cataclysm:ignitium_upgrade_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:magma_cream'
  }
)

event.shaped(
  Item.of('armory_rpgs:epic_armor_upgrade'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'minecraft:netherite_scrap'
  }
)

event.shaped(
  Item.of('deep_aether:stratus_smithing_template'), // arg 1: output
  [
    'AAA',
    'ABA', // arg 2: the shape (array of strings)
    'AAA'
  ],
  {
    A: 'minecraft:copper_ingot',
	B: 'aether:zanite_gemstone'
  }
)

// Crafting table fix

event.shaped(
  Item.of('minecraft:crafting_table'), // arg 1: output
  [
    'AA ',
    'AA ', // arg 2: the shape (array of strings)
    '   '
  ],
  {
    A: '#minecraft:planks'
  }
)

// Dough compat

event.replaceInput(
  { input: 'create:dough' }, // Arg 1: the filter
  'create:dough',            // Arg 2: the item to replace
  'farmersdelight:wheat_dough'         // Arg 3: the item to replace it with
  // Note: tagged fluid ingredients do not work on Fabric, but tagged items do.
)

event.replaceOutput(
  { output: 'create:dough' }, // Arg 1: the filter
  'create:dough',            // Arg 2: the item to replace
  'farmersdelight:wheat_dough'         // Arg 3: the item to replace it with
  // Note: tagged fluid ingredients do not work on Fabric, but tagged items do.
)

// Blackstone, zinc, and basalt recipes
    
event.recipes.create.crushing(['minecraft:basalt', CreateItem.of('create:zinc_nugget', 0.15)], 'minecraft:blackstone')

// Elytra recipe.

event.shaped(
  Item.of('minecraft:elytra'), // arg 1: output
  [
    ' C ',
    'CAC', // arg 2: the shape (array of strings)
    'CBC'
  ],
  {
    A: 'quark:dragon_scale',
    B: 'create:sturdy_sheet',
    C: 'minecraft:phantom_membrane'
  }
)

// Ghast recipes.

event.shaped(
  Item.of('minecraft:ghast_tear'), // arg 1: output
  [
    ' C ',
    'BAB', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'minecraft:phantom_membrane',
    B: 'minecraft:gunpowder',
    C: 'minecraft:blaze_powder'
  }
)

// Waystone recipe.

//event.remove({ output: 'waystones:warp_stone' })

//event.shaped(
//  Item.of('waystones:warp_stone'), // arg 1: output
//  [
//    'ACA',
//    'CBC', // arg 2: the shape (array of strings)
//    'ACA'
//  ],
//  {
//    A: 'minecraft:amethyst_shard',
//	B: 'minecraft:ender_pearl',
//    C: 'minecraft:diamond',  
//  }
//)

// Drill recipe.

event.remove({ output: 'create:mechanical_drill' })

event.shaped(
  Item.of('create:mechanical_drill'), // arg 1: output
  [
    ' B ',
    'CAC', // arg 2: the shape (array of strings)
    ' C '
  ],
  {
    A: 'create:powdered_obsidian',
	B: 'minecraft:diamond',
	C: 'create:andesite_alloy'
  }
)

// Explorer's compass recipe.

event.remove({ output: 'explorerscompass:explorerscompass' })

event.shaped(
  Item.of('explorerscompass:explorerscompass'), // arg 1: output
  [
    'ACA',
    'CBC', // arg 2: the shape (array of strings)
    'ACA'
  ],
  {
    A: 'minecraft:redstone',
	B: 'minecraft:compass',
    C: 'aether:zanite_gemstone',  
  }
)

// String from wool.
    
event.shapeless(
  Item.of('minecraft:string', 4), // arg 1: output
  [
    'minecraft:white_wool', 	       // arg 2: the array of inputs
  ]
)
    
// Easier arrows.
    
event.shaped(
  Item.of('minecraft:arrow', 16), // arg 1: output
  [
    '  A',
    ' B ', // arg 2: the shape (array of strings)
    'C  '
  ],
  {
    A: 'minecraft:iron_nugget',
	B: 'minecraft:stick',
    C: 'minecraft:string',  
  }
)
    
event.shaped(
  Item.of('minecraft:arrow', 16), // arg 1: output
  [
    '  A',
    ' B ', // arg 2: the shape (array of strings)
    'C  '
  ],
  {
    A: 'minecraft:flint',
	B: 'minecraft:stick',
    C: 'minecraft:feather',  
  }
)
 
// Green dye for colorblind people.

event.shapeless(
  Item.of('minecraft:green_dye', 2), // arg 1: output
  [
    'minecraft:white_dye', 	       // arg 2: the array of inputs
	'minecraft:brown_dye'
  ]
)

event.shapeless(
  Item.of('minecraft:green_dye', 2), // arg 1: output
  [
    'minecraft:kelp' 	       // arg 2: the array of inputs
  ]
)

// Full Blone Block to Bone Meal.

event.shapeless(
  Item.of('minecraft:bone_meal', 4), // arg 1: output
  [
    'betternether:bone_block' 	       // arg 2: the array of inputs
  ]
)

// Slime ball recipe.

event.smelting('minecraft:kelp', 'minecraft:slime_ball')

// Andesite recipe

event.shapeless(
  Item.of('minecraft:andesite', 1), // arg 1: output
  [
    'minecraft:cobblestone',
    'minecraft:gravel', 	       // arg 2: the array of inputs
  ]
)
	
//Add recipe for nametags.

event.shaped(
  Item.of('minecraft:name_tag', 1), // arg 1: output
  [
    ' B ',
    ' B ', // arg 2: the shape (array of strings)
    ' A '
  ],
  {
    A: 'minecraft:paper',
	B: 'create:iron_sheet'
  }
)

// Change hammer Recipe

event.shaped(
  Item.of('onlyhammersandexcavators:stone_hammer', 1), // arg 1: output
  [
    'ACA',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'minecraft:cobblestone',
	B: 'minecraft:stick',
	C: 'minecraft:iron_nugget'
  }
)

// Smelt rotten flesh into leather.

event.smoking('minecraft:leather', 'minecraft:rotten_flesh').xp(0.15)

event.campfireCooking('minecraft:leather', 'minecraft:rotten_flesh', 0.15, 20)

// Recipe changes for tom's simple storage.

event.remove({ output: 'toms_storage:inventory_connector' })
event.remove({ output: 'toms_storage:crafting_terminal' })
event.remove({ output: 'toms_storage:storage_terminal' })

event.shaped(
  Item.of('toms_storage:inventory_connector', 1), // arg 1: output
  [
    'A B',
    ' C ', // arg 2: the shape (array of strings)
    'B A'
  ],
  {
    A: 'minecraft:copper_ingot',
    B: 'create:andesite_casing',  //arg 3: the mapping object
    C: 'minecraft:chest'
  }
)

event.shaped(
  Item.of('toms_storage:storage_terminal', 1), // arg 1: output
  [
    'A B',
    ' C ', // arg 2: the shape (array of strings)
    'B A'
  ],
  {
    A: 'create:andesite_alloy',
    B: 'minecraft:redstone',  //arg 3: the mapping object
    C: 'create:andesite_casing'
  }
)

event.shaped(
  Item.of('toms_storage:crafting_terminal', 1), // arg 1: output
  [
    'A B',
    ' C ', // arg 2: the shape (array of strings)
    'B A'
  ],
  {
    A: 'minecraft:copper_ingot',
    B: 'minecraft:crafting_table',  //arg 3: the mapping object
    C: 'toms_storage:storage_terminal'
  }
)

event.shaped(
  Item.of('toms_storage:inventory_cable_connector', 1), // arg 1: output
  [
    'A B',
    ' C ', // arg 2: the shape (array of strings)
    'B A'
  ],
  {
    A: 'minecraft:copper_ingot',
    B: 'create:andesite_alloy',  //arg 3: the mapping object
    C: 'toms_storage:inventory_cable'
  }
)

// Eyes of ender require variety

event.remove({ output: 'minecraft:ender_eye' })

event.shaped(
  Item.of('minecraft:ender_eye', 4), // arg 1: output
  [
    'B C',
    'ADA', // arg 2: the shape (array of strings)
    'E F'
  ],
  {
    A: 'minecraft:blaze_powder',
    B: 'minecraft:breeze_rod',  //arg 3: the mapping object
	C: 'minecraft:echo_shard',
	D: 'minecraft:ender_pearl',
	E: 'minecraft:prismarine_shard',
	F: 'aether:zanite_gemstone'
  }
)

// Cataclysm armor requires aeternium armor

event.remove({ output: 'cataclysm:ignitium_helmet' })
event.remove({ output: 'cataclysm:ignitium_chestplate' })
event.remove({ output: 'cataclysm:ignitium_boots' })
event.remove({ output: 'cataclysm:ignitium_leggings' })
event.remove({ output: 'cataclysm:cursium_helmet' })
event.remove({ output: 'cataclysm:cursium_chestplate' })
event.remove({ output: 'cataclysm:cursium_boots' })
event.remove({ output: 'cataclysm:cursium_leggings' })

event.smithing(
  'cataclysm:ignitium_helmet',                     // arg 1: output
  'cataclysm:ignitium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_helmet',                          // arg 3: the item to be upgraded
  'cataclysm:ignitium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:ignitium_chestplate',                     // arg 1: output
  'cataclysm:ignitium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_chestplate',                          // arg 3: the item to be upgraded
  'cataclysm:ignitium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:ignitium_boots',                     // arg 1: output
  'cataclysm:ignitium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_leggings',                          // arg 3: the item to be upgraded
  'cataclysm:ignitium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:ignitium_leggings',                     // arg 1: output
  'cataclysm:ignitium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_boots',                          // arg 3: the item to be upgraded
  'cataclysm:ignitium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:cursium_helmet',                     // arg 1: output
  'cataclysm:cursium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_helmet',                          // arg 3: the item to be upgraded
  'cataclysm:cursium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:cursium_chestplate',                     // arg 1: output
  'cataclysm:cursium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_chestplate',                          // arg 3: the item to be upgraded
  'cataclysm:cursium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:cursium_boots',                     // arg 1: output
  'cataclysm:cursium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_leggings',                          // arg 3: the item to be upgraded
  'cataclysm:cursium_ingot'                            // arg 4: the upgrade item
)

event.smithing(
  'cataclysm:cursium_leggings',                     // arg 1: output
  'cataclysm:cursium_upgrade_smithing_template', // arg 2: the smithing template
  'betterend:aeternium_boots',                          // arg 3: the item to be upgraded
  'cataclysm:cursium_ingot'                            // arg 4: the upgrade item
)

// Armor requires sheets and netherite requires sturdy sheets

event.replaceInput({ id: 'minecraft:golden_helmet' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'minecraft:golden_chestplate' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'minecraft:golden_leggings' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'minecraft:golden_boots' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'minecraft:iron_helmet' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'minecraft:iron_chestplate' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'minecraft:iron_leggings' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'minecraft:iron_boots' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'minecraft:chain' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_head' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_chest' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_legs' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_feet' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_head' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_chest' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_legs' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_feet' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_head' }, 'minecraft:copper_ingot', 'create:copper_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_chest' }, 'minecraft:copper_ingot', 'create:copper_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_legs' }, 'minecraft:copper_ingot', 'create:copper_sheet')
event.replaceInput({ id: 'paladins:paladin_armor_feet' }, 'minecraft:copper_ingot', 'create:copper_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_head' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_chest' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_legs' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:crusader_armor_feet' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:prior_robe_head' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:prior_robe_chest' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:prior_robe_legs' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'paladins:prior_robe_feet' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'rogues:assassin_armor_head' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'rogues:assassin_armor_chest' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'rogues:assassin_armor_legs' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'rogues:assassin_armor_feet' }, 'minecraft:gold_ingot', 'create:golden_sheet')
event.replaceInput({ id: 'rogues:warrior_armor_head' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'rogues:warrior_armor_chest' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'rogues:warrior_armor_legs' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'rogues:warrior_armor_feet' }, 'minecraft:iron_ingot', 'create:iron_sheet')
event.replaceInput({ id: 'minecraft:netherite_ingot' }, 'minecraft:gold_ingot', 'create:sturdy_sheet')

// Betterend ore fixes

event.recipes.create.crushing(['minecraft:ender_pearl', CreateItem.of('betterend:ender_shard', 0.15)], 'betterend:ender_shard')

event.recipes.create.crushing(['betterend:ender_shard', CreateItem.of('betterend:ender_dust', 0.15)], 'betterend:ender_dust')

event.recipes.create.mixing(['betterend:terminite_ingot'], ['betterend:thallasium_ingot', 'betterend:ender_dust']).heated()

event.replaceInput(
  { input: 'endersdelight:ender_shard' }, // Arg 1: the filter
  'endersdelight:ender_shard',            // Arg 2: the item to replace
  'betterend:ender_shard'         // Arg 3: the item to replace it with
)
	
// Betterend Armor and Tool Changes

event.recipes.create.mixing(['betterend:aeternium_ingot'], ['minecraft:netherite_scrap', 'aether:enchanted_gravitite']).heated()
event.recipes.create.mixing(['betterend:aeternium_ingot'], ['minecraft:netherite_scrap', 'aether:enchanted_gravitite']).heated()

event.recipes.create.compacting('betterend:terminite_forged_plate', 'betterend:terminite_ingot')
event.recipes.create.compacting('betterend:aeternium_forged_plate', 'betterend:aeternium_ingot')

event.remove({ output: 'betterend:terminite_pickaxe' })
event.remove({ output: 'betterend:terminite_hoe' })
event.remove({ output: 'betterend:terminite_shovel' })
event.remove({ output: 'betterend:terminite_axe' })
event.remove({ output: 'betterend:terminite_sword' })
event.remove({ output: 'betterend:aeternium_pickaxe' })
event.remove({ output: 'betterend:aeternium_hoe' })
event.remove({ output: 'betterend:aeternium_shovel' })
event.remove({ output: 'betterend:aeternium_axe' })
event.remove({ output: 'betterend:aeternium_sword' })

event.shaped(
  Item.of('betterend:terminite_sword', 1), // arg 1: output
  [
    ' A ',
    ' A ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:terminite_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:terminite_axe', 1), // arg 1: output
  [
    ' AA',
    ' BA', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:terminite_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:terminite_shovel', 1), // arg 1: output
  [
    ' A ',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:terminite_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:terminite_hoe', 1), // arg 1: output
  [
    ' AA',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:terminite_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:terminite_pickaxe', 1), // arg 1: output
  [
    'AAA',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:terminite_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:aeternium_sword', 1), // arg 1: output
  [
    ' A ',
    ' A ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:aeternium_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:aeternium_axe', 1), // arg 1: output
  [
    ' AA',
    ' BA', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:aeternium_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:aeternium_shovel', 1), // arg 1: output
  [
    ' A ',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:aeternium_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:aeternium_hoe', 1), // arg 1: output
  [
    ' AA',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:aeternium_ingot',
    B: 'minecraft:stick'
  }
)

event.shaped(
  Item.of('betterend:aeternium_pickaxe', 1), // arg 1: output
  [
    'AAA',
    ' B ', // arg 2: the shape (array of strings)
    ' B '
  ],
  {
    A: 'betterend:aeternium_ingot',
    B: 'minecraft:stick'
  }
)

//Closing brackets.

	}
)

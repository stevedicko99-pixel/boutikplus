// fonts.js — Réduit drastiquement la taille du bundle en ne gardant que
// les familles d'icônes réellement utilisées dans le code.
//
// Seules deux familles sont utilisées :
//   - Feather (100+ fichiers)
//   - MaterialCommunityIcons (quelques-uns, p.ex. "whatsapp", "star", "truck-fast")
//
// Toutes les autres familles (FontAwesome, Ionicons, AntDesign, Entypo,
// Foundation, Fontisto, Octicons, SimpleLineIcons, Zocial, MaterialIcons)
// sont exclues du build. Économie estimée : ~2.5 MB.
module.exports = {
  fonts: [
    'Feather',
    'MaterialCommunityIcons',
  ],
};

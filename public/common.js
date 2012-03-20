var getLayer = function(map, name) {
    for (key in map.layers) {
        if (name == map.layers[key].name) {
            return map.layers[key];
        }
    }
    return null;
}

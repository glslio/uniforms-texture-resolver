var _ = require("lodash");
var Q = require("q");

function filterUniforms (uniforms) {
  return _.omit(uniforms, function (u) { return typeof u !== "string"; });
}

// loadImage : (path) => Promise of Texture or Texture
// loadImage can refuse a path (e.g. for validation) by returning a Failure Promise / or throwing an exception
function UniformsTextureResolver (loadImage) {
  this.loadImage = loadImage;
  this.lazyLoadingImages = {};
  this.lazyLoadedImages = {};
}

UniformsTextureResolver.prototype = {
  loadTexture: function (path) {
    var self = this;
    if (this.lazyLoadingImages[path]) return this.lazyLoadingImages[path];
    var maybeImage = Q.fcall(function () {
      return self.loadImage(path);
    });
    this.lazyLoadingImages[path] = maybeImage;
    maybeImage.then(function (img) {
      self.lazyLoadedImages[path] = img;
    }, function (e) {
      console.log("Cannot load '"+path+"' :"+e);
      self.lazyLoadedImages[path] = null;
    }).done();
    return maybeImage;
  },

  resolve: function (uniforms) {
    var self = this;
    var all = _.clone(uniforms);
    var textureUniforms = filterUniforms(all);
    return Q.all(_.map(textureUniforms, function (path, key) {
      return self.loadTexture(path).then(function (img) {
        return [ key, img ];
      }, function () {
        return [ key, null ];
      });
    })).then(function (pairsOfTextures) {
      return _.extend(all, _.object(pairsOfTextures));
    });
  },

  getTextureOrNull: function (path) {
    this.loadTexture(path);
    if (path in this.lazyLoadedImages)
      return this.lazyLoadedImages[path];
    else
      return null;
  },

  resolveSync: function (uniforms) {
    var all = _.clone(uniforms);
    var textureUniforms = filterUniforms(all);
    return _.extend(all, _.mapValues(textureUniforms, this.getTextureOrNull));
  }

};


module.exports = UniformsTextureResolver;


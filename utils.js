const fs = require('fs');

const storeData = (data, path) => {
    try {
        if( overwrite ){
          fs.writeFileSync(path, JSON.stringify(data, null, 4));
        } else {
          let loaded =loadData(path);
          if( loaded != undefined ) loaded = JSON.parse(loaded);
          data.forEach(e => loaded.push(data));
          fs.writeFileSync(path, JSON.stringify(loaded, null, 4));
        }
        
    } catch (err) {
        console.error(err)
    }
}

const loadData = (path) => {
    try {
      return fs.readFileSync(path, 'utf8')
    } catch (err) {
      console.error(err)
      return false
    }
  }

module.exports = {
    storeData,
    loadData
}
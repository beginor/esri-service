# esri-service

Common used methods helper for ArcGIS JS API

## Install

```bash
npm i esri-service
```

## Sample usage

```ts
import * as arcgis from 'esri-service';

const map = await arcgis.createMap({
    basemap: 'satellite',
    ground: 'world-elevation'
});

const sceneView = await arcgis.createSceneView({
    container: document.getElementById('map'),
    map,
    zoom: 7,
    center: { longitude: 113.2, latitude: 23.4 },
    viewingMode: 'local'
});
await sceneView.when();
```

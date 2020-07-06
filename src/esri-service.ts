import { loadModules } from 'esri-loader';

// tslint:disable-next-line:ban-types
const sceneViewResolvers: Function[] = [];
let sceneView: __esri.SceneView;
// tslint:disable-next-line:ban-types
const mapViewResolvers: Function[] = [];
let mapView: __esri.MapView;

export function getSceneView(): Promise<__esri.SceneView> {
    return new Promise<__esri.SceneView>((resolve, reject) => {
        if (sceneView) {
            resolve(sceneView);
            return;
        }
        sceneViewResolvers.push(resolve);
    });
}

export function setSceneView(view: __esri.SceneView) {
    sceneView = view;
    if (sceneViewResolvers.length > 0) {
        sceneViewResolvers.forEach(resolve => {
            resolve(sceneView);
        });
        sceneViewResolvers.length = 0;
    }
}

export function getMapView(): Promise<__esri.MapView> {
    return new Promise<any>((resolve, reject) => {
        if (mapView) {
            resolve(mapView);
            return;
        }
        mapViewResolvers.push(resolve);
    });
}

export function setMapView(view: __esri.MapView) {
    mapView = view;
    if (mapViewResolvers.length > 0) {
        mapViewResolvers.forEach(resolve => {
            resolve(mapView);
        });
        mapViewResolvers.length = 0;
    }
}

export async function createBasemapFromId(
    basemapId: string
): Promise<__esri.Basemap> {
    const [Basemap] = await loadModules([
        'esri/Basemap'
    ]);
    return Basemap.fromId(basemapId);
}

export async function createMap(
    properties: __esri.MapProperties
): Promise<__esri.Map> {
    await castLayers(properties);
    const [Map] = await loadModules([
        'esri/Map'
    ]);
    await castLayers(properties);
    return new Map(properties);
}

export async function createMapView(
    properties: __esri.MapViewProperties
): Promise<__esri.MapView> {
    const [MapView] = await loadModules([
        'esri/views/MapView'
    ]);
    return new MapView(properties);
}

export async function createSceneView(
    properties: __esri.SceneViewProperties
): Promise<__esri.SceneView> {
    const [SceneView] = await loadModules([
        'esri/views/SceneView'
    ]);
    return new SceneView(properties);
}

export async function createLocalSource(
    propertiesArr: __esri.BasemapProperties[]
): Promise<__esri.LocalBasemapsSource> {
    const basemapArr: __esri.Basemap[] = [];
    const [Basemap, LocalBasemapsSource] = await loadModules([
        'esri/Basemap',
        'esri/widgets/BasemapGallery/support/LocalBasemapsSource'
    ]);
    //
    for (const properties of propertiesArr) {
        const basemap = new Basemap(properties);
        basemapArr.push(basemap);
    }
    return new LocalBasemapsSource({
        basemaps: basemapArr
    });
}

export async function createBasemapsGallery(
    galleryProperties: __esri.BasemapGalleryProperties,
    expandPropertis: __esri.ExpandProperties
): Promise<__esri.Expand> {
    const [Expand, BasemapGallery] = await loadModules([
        'esri/widgets/Expand',
        'esri/widgets/BasemapGallery'
    ]);
    galleryProperties.container = document.createElement('div');
    const gallery = new BasemapGallery(galleryProperties);
    expandPropertis.content = gallery.domNode;
    return new Expand(expandPropertis);
}

export async function executeQuery(
    serviceUrl: string,
    query: __esri.QueryProperties | __esri.Query,
    requestOptions?: any
): Promise<__esri.FeatureSet> {
    const [QueryTask, Query] = await loadModules([
        'esri/tasks/QueryTask',
        'esri/tasks/support/Query'
    ]);
    const queryTask: __esri.QueryTask = new QueryTask({
        url: serviceUrl
    });
    let queryParams: any = query;
    // tslint:disable-next-line: no-string-literal
    if (!query['declaredClass']) {
        queryParams = new Query(query);
    }
    const fset = await queryTask.execute(queryParams, requestOptions);
    return fset;
}

export async function createQueryTask(
    properties: __esri.QueryTaskProperties
): Promise<__esri.QueryTask> {
    const [QueryTask] = await loadModules(['esri/tasks/QueryTask']);
    const queryTask: __esri.QueryTask = new QueryTask(properties);
    return queryTask;
}

export async function createGraphic(
    properties?: __esri.GraphicProperties
): Promise<__esri.Graphic> {
    const [Graphic] = await loadModules([
        'esri/Graphic'
    ]);
    return new Graphic(properties);
}

export async function findViewForLayer<
    TLayer extends __esri.Layer,
    TLayerView extends __esri.LayerView
    >(
        view: __esri.View,
        layer: TLayer
    ): Promise<TLayerView> {
    return (await view.whenLayerView(layer)) as TLayerView;
}

export async function buffer(
    geometryServiceUrl: string,
    properties: __esri.BufferParametersProperties
): Promise<__esri.Polygon[]> {
    const [GeometryService, BufferParameters] = await loadModules([
        'esri/tasks/GeometryService',
        'esri/tasks/support/BufferParameters'
    ]);
    const geoSvc: __esri.GeometryService
        = new GeometryService({ url: geometryServiceUrl });
    const params: __esri.BufferParameters = new BufferParameters(
        properties
    );
    return geoSvc.buffer(params);
}

export async function queryLayerFeatures(
    layer: __esri.FeatureLayer,
    properties: __esri.QueryProperties
): Promise<__esri.FeatureSet> {
    const query = layer.createQuery();
    Object.assign(query, properties);
    return layer.queryFeatures(query);
}

/**
 * 查询图层在地图视图上显示的图形
 * @param view scene view
 * @param layer feature layer
 * @param where definitionExpression of the feature layer
 */
export function queryLayerGraphics(
    view: __esri.SceneView,
    layer: __esri.FeatureLayer,
    where: string
): Promise<__esri.FeatureSet> {
    return new Promise<__esri.FeatureSet>((resolve, reject) => {
        view.whenLayerView(layer)
            .then((layerView: __esri.FeatureLayerView) => {
                if (where === layer.definitionExpression) {
                    layerView.queryFeatures()
                        .then((featureSet: __esri.FeatureSet) => {
                            resolve(featureSet);
                        })
                        .catch(err => {
                            reject(err);
                        });
                } else {
                    const handle = layerView.watch('updating', val => {
                        if (!val) {
                            layerView.queryFeatures()
                                .then((featureSet: __esri.FeatureSet) => {
                                    handle.remove();
                                    resolve(featureSet);
                                })
                                .catch(err => {
                                    handle.remove();
                                    reject(err);
                                });
                        }
                    });
                    layer.definitionExpression = where;
                }
            })
            .catch(ex => {
                reject(ex);
            });
    });
}

export async function parseRendererFromJSON<
    T extends __esri.Renderer
    >(
        json: any
    ): Promise<T> {
    const [jsonUtils] = await loadModules([
        'esri/renderers/support/jsonUtils'
    ]);
    return jsonUtils.fromJSON(json);
}

export async function parseWebSceneFromJSON(
    json: any
): Promise<__esri.WebScene> {
    const [WebScene] = await loadModules([
        'esri/WebScene'
    ]);
    const scene: __esri.WebScene = WebScene.fromJSON(json);
    return scene;
}

export async function webMercatorToGeographic(
    extent: __esri.Geometry
): Promise<__esri.Geometry> {
    const [webMercatorUtils] = await loadModules([
        'esri/geometry/support/webMercatorUtils'
    ]);
    return webMercatorUtils.webMercatorToGeographic(extent);
}

export async function createSlideFromView(
    view: any,
    options?: any
): Promise<__esri.Slide> {
    const [Slide] = await loadModules([
        'esri/webscene/Slide'
    ]);
    return Slide.createFrom(view, options);
}

export async function createExtent(
    extentProperties: __esri.ExtentProperties
): Promise<__esri.Extent> {
    const [Extent] = await loadModules([
        'esri/geometry/Extent'
    ]);
    return new Extent(extentProperties);
}

export async function createPoint(
    pointProps: __esri.PointProperties
): Promise<__esri.Point> {
    const [Point] = await loadModules([
        'esri/geometry/Point'
    ]);
    return new Point(pointProps);
}

export async function createPopupTemplate(
    popupTemplateProps: __esri.PopupTemplateProperties
): Promise<__esri.PopupTemplate> {
    const [PopupTemplate] = await loadModules([
        'esri/PopupTemplate'
    ]);
    return new PopupTemplate(popupTemplateProps);
}

export function getViewResolution(view: __esri.SceneView): number {
    const mapWidth = view.extent.width;
    const viewWidth = view.width;
    const resoluation = Math.ceil(mapWidth / viewWidth);
    return resoluation;
}

export interface ActionButtonProperties {
    active?: boolean;
    className?: string;
    disabled?: boolean;
    id?: string;
    image?: string;
    title?: string;
    type?: 'button' | 'toggle';
    visible?: string;
}

export async function createActionButton(
    actionProperties: ActionButtonProperties
): Promise<__esri.ActionButton> {
    const [ActionButton] = await loadModules([
        'esri/support/actions/ActionButton'
    ]);
    return new ActionButton(actionProperties);
}

export async function createField(
    properties?: __esri.FieldProperties
): Promise<__esri.Field> {
    const [Field] = await loadModules([
        'esri/layers/support/Field'
    ]);
    return new Field(properties);
}

export async function parseLabelClassFromJSON(
    json: any
): Promise<__esri.LabelClass> {
    const [LabelClass] = await loadModules([
        'esri/layers/support/LabelClass'
    ]);
    return LabelClass.fromJSON(json);
}

export async function parseSymbolFromJson<T extends __esri.Symbol>(
    json: any
): Promise<T> {
    const [jsonUtils] = await loadModules([
        'esri/symbols/support/jsonUtils'
    ]);
    return jsonUtils.fromJSON(json);
}

export async function parsePresentationFromJSON(
    json: any
): Promise<__esri.Presentation> {
    const [Presentation] = await loadModules([
        'esri/webscene/Presentation'
    ]);
    return Presentation.fromJSON(json);
}

export async function createExpandableLegend(
    legendProps: __esri.LegendProperties,
    expandProps: __esri.ExpandProperties
): Promise<__esri.Expand> {
    const [Expand, Legend] = await loadModules([
        'esri/widgets/Expand',
        'esri/widgets/Legend'
    ]);
    legendProps.container = document.createElement('div');
    const legend = new Legend(legendProps);
    expandProps.view = legendProps.view;
    expandProps.content = legend.domNode;
    return new Expand(expandProps);
}

export async function createBasemap(
    properties: __esri.BasemapProperties
): Promise<__esri.Basemap> {
    if (!!properties.baseLayers) {
        properties.baseLayers = await createLayers(
            properties.baseLayers as any[]
        );
    }
    const [Basemap] = await loadModules<[__esri.BasemapConstructor]>([
        'esri/Basemap'
    ]);
    return new Basemap(properties);
}

export async function parseFeatureSetFromJson(
    json: any
): Promise<__esri.FeatureSet> {
    const [FeatureSet] = await loadModules<[__esri.FeatureSetConstructor]>([
        'esri/tasks/support/FeatureSet'
    ]);
    const result: __esri.FeatureSet = FeatureSet.fromJSON(json);
    return result;
}

export async function createCollection<T>(
    items: T[]
): Promise<__esri.Collection<T>> {
    const [Collection] = await loadModules([
        'esri/core/Collection'
    ]);
    const result: __esri.Collection = new Collection(items);
    return result;
}

/**
 * create a webscene instance by json;
 * @param properties webscene json properties
 */
export async function createWebScene(
    properties: __esri.WebSceneProperties
): Promise<__esri.WebScene> {
    await castLayers(properties);
    let webscene: __esri.WebScene;
    const [WebScene] = await loadModules(['esri/WebScene']);
    webscene = new WebScene(properties);
    return webscene;
}

async function castLayers(properties: __esri.MapProperties) {
    // layers
    if (!!properties.layers) {
        const layersProps = properties.layers as any[];
        properties.layers = await createLayers(layersProps);
    }
    // basemap
    if (!!properties.basemap && typeof properties.basemap !== 'string') {
        const basemapProps = properties.basemap as __esri.BasemapProperties;
        if (!!basemapProps.baseLayers) {
            const layersProps = basemapProps.baseLayers as any[];
            basemapProps.baseLayers = await createLayers(layersProps);
        }
    }
    // ground;
    if (!!properties.ground && typeof properties.ground !== 'string') {
        const groundProps = properties.ground as __esri.GroundProperties;
        if (!!groundProps.layers) {
            const layersProps = groundProps.layers as any[];
            groundProps.layers = await createLayers(layersProps);
        }
    }
}

/**
 * Create a layers from properties;
 * @param layersProps array of layer's properties
 */
export async function createLayers<T extends __esri.Layer>(
    layersProps: any[]
): Promise<T[]> {
    const layers = [];
    for (const layerProps of layersProps) {
        const layer = await createLayer(layerProps);
        layers.push(layer);
    }
    return layers;
}
/**
 * Create a layer from properties;
 * @param props layer's properties
 */
export async function createLayer<T extends __esri.Layer>(
    props: any
): Promise<T> {
    const layerType = props.type;
    delete props.type;
    let layer: T;
    switch (layerType) {
        case 'feature':
            const [FeatureLayer] = await loadModules([
                'esri/layers/FeatureLayer'
            ]);
            layer = new FeatureLayer(props);
            break;
        case 'client-feature':
            layer = await createClientFeatureLayer(props) as any;
            break;
        case 'graphics':
            const [GraphicsLayer] = await loadModules([
                'esri/layers/GraphicsLayer'
            ]);
            layer = new GraphicsLayer(props);
            break;
        case 'tile':
            const [TileLayer] = await loadModules([
                'esri/layers/TileLayer'
            ]);
            let sublayers: __esri.SublayerProperties[];
            if (!!props.sublayers) {
                sublayers = props.sublayers;
                delete props.sublayers;
            }
            layer = new TileLayer(props);
            if (!!sublayers) {
                await layer.load();
                const tile = layer as unknown as __esri.TileLayer;
                for (const sublayer of sublayers) {
                    const subl = tile.sublayers.find(l => l.id === sublayer.id);
                    subl.title = sublayer.title;
                    subl.legendEnabled = sublayer.legendEnabled;
                    subl.popupEnabled = sublayer.popupEnabled;
                    subl.popupTemplate = sublayer.popupTemplate as any;
                }
            }
            break;
        case 'web-tile':
            const [WebTileLayer] = await loadModules([
                'esri/layers/WebTileLayer'
            ]);
            layer = new WebTileLayer(props);
            break;
        case 'elevation':
            const [ElevationLayer] = await loadModules([
                'esri/layers/ElevationLayer'
            ]);
            layer = new ElevationLayer(props);
            break;
        case 'exaggerated-elevation':
            const [ExaggeratedElevationLayer] = await loadModules([
                'beginor/layers/ExaggeratedElevationLayer'
            ]);
            layer = new ExaggeratedElevationLayer(props);
            break;
        case 'imagery':
            const [ImageryLayer] = await loadModules([
                'esri/layers/ImageryLayer'
            ]);
            layer = new ImageryLayer(props);
            break;
        case 'integrated-mesh':
            const [IntegratedMeshLayer] = await loadModules([
                'esri/layers/IntegratedMeshLayer'
            ]);
            layer = new IntegratedMeshLayer(props);
            break;
        case 'map-image':
            const [MapImageLayer] = await loadModules([
                'esri/layers/MapImageLayer'
            ]);
            layer = new MapImageLayer(props);
            break;
        case 'map-notes':
            const [MapNotesLayer] = await loadModules([
                'esri/layers/MapNotesLayer'
            ]);
            layer = new MapNotesLayer(props);
            break;
        case 'point-cloud':
            const [PointCloudLayer] = await loadModules([
                'esri/layers/PointCloudLayer'
            ]);
            layer = new PointCloudLayer(props);
            break;
        case 'scene':
            const [SceneLayer] = await loadModules([
                'esri/layers/SceneLayer'
            ]);
            layer = new SceneLayer(props);
            break;
        case 'stream':
            const [StreamLayer] = await loadModules([
                'esri/layers/StreamLayer'
            ]);
            layer = new StreamLayer(props);
            break;
        case 'vector-tile':
            const [VectorTileLayer] = await loadModules([
                'esri/layers/VectorTileLayer'
            ]);
            layer = new VectorTileLayer(props);
            break;
        case 'bing-maps':
            const [BingMapsLayer] = await loadModules([
                'esri/layers/BingMapsLayer'
            ]);
            layer = new BingMapsLayer(props);
            break;
        case 'csv':
            const [CSVLayer] = await loadModules([
                'esri/layers/CSVLayer'
            ]);
            layer = new CSVLayer(props);
            break;
        case 'georss':
            const [GeoRSSLayer] = await loadModules([
                'esri/layers/GeoRSSLayer'
            ]);
            layer = new GeoRSSLayer(props);
            break;
        case 'group':
            if (!!props.layers) {
                props.layers = await createLayers(props.layers);
            }
            const [GroupLayer] = await loadModules([
                'esri/layers/GroupLayer'
            ]);
            layer = new GroupLayer(props);
            break;
        case 'kml':
            const [KMLLayer] = await loadModules([
                'esri/layers/KMLLayer'
            ]);
            layer = new KMLLayer(props);
            break;
        case 'open-street-map':
            const [OpenStreetMapLayer] = await loadModules([
                'esri/layers/OpenStreetMapLayer'
            ]);
            layer = new OpenStreetMapLayer(props);
            break;
        case 'wms':
            const [WMSLayer] = await loadModules([
                'esri/layers/WMSLayer'
            ]);
            layer = new WMSLayer(props);
            break;
        case 'wmts':
            const [WMTSLayer] = await loadModules([
                'esri/layers/WMTSLayer'
            ]);
            layer = new WMTSLayer(props);
            break;
        default:
            throw new Error(`Unknown layer type: ${layerType}`);
    }
    return layer;
}

export function createFeatureLayer(
    properties: __esri.FeatureLayerProperties
): Promise<__esri.FeatureLayer> {
    Object.assign(properties, { type: 'feature' });
    return createLayer<__esri.FeatureLayer>(properties);
}
export function createGraphicsLayer(
    properties: __esri.GraphicsLayerProperties
): Promise<__esri.GraphicsLayer> {
    Object.assign(properties, { type: 'graphics' });
    return createLayer<__esri.GraphicsLayer>(properties);
}
export function createTileLayer(
    properties: __esri.TileLayerProperties
): Promise<__esri.TileLayer> {
    Object.assign(properties, { type: 'tile' });
    return createLayer<__esri.TileLayer>(properties);
}
export function createWebTileLayer(
    properties: __esri.WebTileLayerProperties
): Promise<__esri.WebTileLayer> {
    Object.assign(properties, { type: 'web-tile' });
    return createLayer<__esri.WebTileLayer>(properties);
}
export function createElevationLayer(
    properties: __esri.ElevationLayerProperties
): Promise<__esri.ElevationLayer> {
    Object.assign(properties, { type: 'elevation' });
    return createLayer<__esri.ElevationLayer>(properties);
}
export function createExaggeratedElevationLayer(
    properties: { url: string; exaggeration: number; }
): Promise<__esri.BaseElevationLayer> {
    Object.assign(properties, { type: 'exaggerated-elevation' });
    return createLayer<__esri.BaseElevationLayer>(properties);
}

export function createImageryLayer(
    properties: __esri.ImageryLayerProperties
): Promise<__esri.ImageryLayer> {
    Object.assign(properties, { type: 'imagery' });
    return createLayer<__esri.ImageryLayer>(properties);
}
export function createIntegratedMeshLayer(
    properties: __esri.IntegratedMeshLayerProperties
): Promise<__esri.IntegratedMeshLayer> {
    Object.assign(properties, { type: 'integrated-mesh' });
    return createLayer<__esri.IntegratedMeshLayer>(properties);
}
export function createMapImageLayer(
    properties: __esri.MapImageLayerProperties
): Promise<__esri.MapImageLayer> {
    Object.assign(properties, { type: 'map-image' });
    return createLayer<__esri.MapImageLayer>(properties);
}
export function createMapNotesLayer(
    properties: __esri.MapNotesLayerProperties
): Promise<__esri.MapNotesLayer> {
    Object.assign(properties, { type: 'map-notes' });
    return createLayer<__esri.MapNotesLayer>(properties);
}
export function createPointCloudLayer(
    properties: __esri.PointCloudLayerProperties
): Promise<__esri.PointCloudLayer> {
    Object.assign(properties, { type: 'point-cloud' });
    return createLayer<__esri.PointCloudLayer>(properties);
}
export function createSceneLayer(
    properties: __esri.SceneLayerProperties
): Promise<__esri.SceneLayer> {
    Object.assign(properties, { type: 'scene ' });
    return createLayer<__esri.SceneLayer>(properties);
}
export function createStreamLayer(
    properties: __esri.StreamLayerProperties
): Promise<__esri.StreamLayer> {
    Object.assign(properties, { type: 'stream ' });
    return createLayer<__esri.StreamLayer>(properties);
}
export function createVectorTileLayer(
    properties: __esri.VectorTileLayerProperties
): Promise<__esri.VectorTileLayer> {
    Object.assign(properties, { type: 'vector-tile' });
    return createLayer<__esri.VectorTileLayer>(properties);
}
export function createBingMapsLayer(
    properties: __esri.BingMapsLayerProperties
): Promise<__esri.BingMapsLayer> {
    Object.assign(properties, { type: 'bing-maps' });
    return createLayer<__esri.BingMapsLayer>(properties);
}
export function createCSVLayer(
    properties: __esri.CSVLayerProperties
): Promise<__esri.CSVLayer> {
    Object.assign(properties, { type: 'csv' });
    return createLayer<__esri.CSVLayer>(properties);
}
export function createGeoRSSLayer(
    properties: __esri.GeoRSSLayerProperties
): Promise<__esri.GeoRSSLayer> {
    Object.assign(properties, { type: 'georss' });
    return createLayer<__esri.GeoRSSLayer>(properties);
}
export function createGroupLayer(
    properties: __esri.GroupLayerProperties
): Promise<__esri.GroupLayer> {
    Object.assign(properties, { type: 'group' });
    return createLayer<__esri.GroupLayer>(properties);
}
export function createKMLLayer(
    properties: __esri.KMLLayerProperties
): Promise<__esri.KMLLayer> {
    Object.assign(properties, { type: 'kml' });
    return createLayer<__esri.KMLLayer>(properties);
}
export function createOpenStreetMapLayer(
    properties: __esri.OpenStreetMapLayerProperties
): Promise<__esri.OpenStreetMapLayer> {
    Object.assign(properties, { type: 'open-street-map' });
    return createLayer<__esri.OpenStreetMapLayer>(properties);
}
export function createWMSLayer(
    properties: __esri.WMSLayerProperties
): Promise<__esri.WMSLayer> {
    Object.assign(properties, { type: 'wms' });
    return createLayer<__esri.WMSLayer>(properties);
}
export function createWMTSLayer(
    properties: __esri.WMTSLayerProperties
): Promise<__esri.WMTSLayer> {
    Object.assign(properties, { type: 'wmts' });
    return createLayer<__esri.WMTSLayer>(properties);
}

export async function createDistanceMeasurement2D(
    properties: __esri.DistanceMeasurement2DProperties
): Promise<__esri.DistanceMeasurement2D> {
    const [DistanceMeasurement2D] = await loadModules([
        'esri/widgets/DistanceMeasurement2D'
    ]);
    return new DistanceMeasurement2D(properties);
}

export async function createDirectLineMeasurement3D(
    properties: __esri.DirectLineMeasurement3DProperties
): Promise<__esri.DirectLineMeasurement3D> {
    const [DirectLineMeasurement3D] = await loadModules([
        'esri/widgets/DirectLineMeasurement3D'
    ]);
    return new DirectLineMeasurement3D(properties);
}

export async function createAreaMeasurement2D(
    properties: __esri.AreaMeasurement2DProperties
): Promise<__esri.AreaMeasurement2D> {
    const [AreaMeasurement2D] = await loadModules([
        'esri/widgets/AreaMeasurement2D'
    ]);
    return new AreaMeasurement2D(properties);
}

export async function createAreaMeasurement3D(
    properties: __esri.AreaMeasurement3DProperties
): Promise<__esri.AreaMeasurement3D> {
    const [AreaMeasurement3D] = await loadModules([
        'esri/widgets/AreaMeasurement3D'
    ]);
    return new AreaMeasurement3D(properties);
}

export async function createWatchUtils(): Promise<__esri.watchUtils> {
    const [watchUtils] = await loadModules([
        'esri/core/watchUtils'
    ]);
    return watchUtils;
}

/**
 * fly to target with random heading and tilt, default zoom level is 17.
 */
export async function flyTo(
    view: __esri.SceneView,
    // tslint:disable-next-line: max-line-length
    target: number[] | __esri.Geometry | __esri.Geometry[] | __esri.Collection<__esri.Geometry> | __esri.Graphic | __esri.Graphic[] | __esri.Collection<__esri.Graphic> | __esri.Viewpoint | __esri.Camera,
    zoom: number = 17
): Promise<void> {
    let heading = Math.random() * 80.0 - 40.0;
    heading = view.camera.heading + heading;
    const tilt = 75.0 - Math.random() * 15.0 ;
    let z = view.zoom;
    if (z < zoom) {
        z = zoom;
    }
    await view.goTo(
        { target, heading, tilt, zoom: z },
        { animate: true, easing: 'in-out-cubic' }
    );
}

export async function createFeatureSet(
    properties: __esri.FeatureSetProperties
): Promise<__esri.FeatureSet> {
    const [FeatureSet] = await loadModules<[__esri.FeatureSetConstructor]>([
        'esri/tasks/support/FeatureSet'
    ]);
    return new FeatureSet(properties);
}

export interface BaseRendererProperties {
    view: __esri.SceneView;
    alpha?: boolean;
    antialias?: boolean;
    useDevicePixelRatio?: boolean;
    wireframe?: boolean;
}

export interface TextureRendererProperties extends BaseRendererProperties {
    /** 经纬度范围 */
    extent: __esri.ExtentProperties;
    /** 海拔高度 */
    elevation?: number;
    /** 贴图地址， 如果跨域， 则必须配置允许 cors 访问 */
    textureUrl: string;
    opacity?: number;
    /** 刷新时间间隔， 以毫秒为单位, 大于 0 起效 */
    refreshInterval?: number;
}

export interface TextureRenderer extends __esri.ExternalRenderer {
    loadTexture(url: string): Promise<any>;
}

/** 创建外部贴图渲染器(ThreeJS) */
export async function createTextureRenderer(
    properties: TextureRendererProperties
): Promise<TextureRenderer> {
    const [Texture] = await loadModules([
        'beginor/renderers/3d/TextureRenderer']
    );
    return new Texture.TextureRenderer(properties);
}

/** 先查询 FeatureLayer 服务的要素集 (FeatureSet) ， 然后在客户端创建专题图层 (FeatureLayer) */
export async function createClientFeatureLayer(
    properties: __esri.FeatureLayerProperties
): Promise<__esri.FeatureLayer> {
    const featureSet = await executeQuery(
        properties.url,
        {
            returnGeometry: true,
            outFields: properties.outFields,
            where: properties.definitionExpression
        }
    );
    const { url, outFields, definitionExpression } = properties;
    delete properties.url;
    delete properties.outFields;
    delete properties.definitionExpression;
    properties.fields = featureSet.fields;
    properties.source = featureSet.features;
    properties.spatialReference = featureSet.spatialReference;
    properties.displayField = featureSet.displayFieldName;
    const layer = await createFeatureLayer(properties);
    // tslint:disable: no-string-literal
    layer['__url'] = url;
    layer['__outFields'] = JSON.stringify(outFields);
    layer['__definitionExpression'] = definitionExpression;
    // tslint:enable: no-string-literal
    return layer;
}

export async function updateClientFeatureLayer(
    layer: __esri.FeatureLayer,
    params: ClientFeatureLayerUpdateParams
): Promise<void> {
    if (!layer.source) {
        throw new Error(
            `layer ${layer.id}-${layer.title} is not client feature layer`
        );
    }
    // tslint:disable: no-string-literal
    let url = layer['__url'] as string;
    if (!!params.url && params.url !== url) {
        url = params.url;
    }
    let outFields = layer['__outFields'] as string;
    if (!!params.outFields) {
        const outFieldsStr = JSON.stringify(params.outFields);
        if (outFields !== outFieldsStr) {
            outFields = outFieldsStr;
        }
    }
    let definitionExpression = layer['__definitionExpression'] as string;
    if (!!params.definitionExpression
        && params.definitionExpression !== definitionExpression) {
        definitionExpression = params.definitionExpression;
    }
    const featureSet = await executeQuery(
        url,
        {
            returnGeometry: true,
            outFields: JSON.parse(outFields),
            where: definitionExpression
        }
    );
    layer.fields = featureSet.fields;
    layer.source = featureSet.features as any;
    layer.spatialReference = featureSet.spatialReference;
    layer.displayField = featureSet.displayFieldName;
    layer.refresh();
    layer['__url'] = url;
    layer['__outFields'] = outFields;
    layer['__definitionExpression'] = definitionExpression;
    // tslint:enable: no-string-literal
}

export interface ClientFeatureLayerUpdateParams {
    url?: string;
    outFields?: string[];
    definitionExpression?: string;
}

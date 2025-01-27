import qlik from 'qlik';

function createCube (definition, app) {
  return new Promise(resolve => {
    app.createCube(definition, resolve);
  });
}

async function buildDataCube (originCubeDefinition, originCube, app) {
  const cubeDefinition = {
    ...originCubeDefinition,
    qInitialDataFetch: [
      {
        qHeight: originCube.qSize.qcy,
        qWidth: originCube.qSize.qcx
      }
    ],
    qDimensions: [originCubeDefinition.qDimensions[0]],
    qMeasures: originCubeDefinition.qMeasures
  };
  if (originCube.qDimensionInfo.length === 2) {
    cubeDefinition.qDimensions.push(originCubeDefinition.qDimensions[1]);
  }
  const cube = await createCube(cubeDefinition, app);
  const cubeMatrix = cube.qHyperCube.qDataPages[0].qMatrix;
  app.destroySessionObject(cube.qInfo.qId);
  return cubeMatrix;
}

export async function initializeDataCube (component, layout) {
  if (component.backendApi.isSnapshot) {
    return layout.snapshotData.dataCube;
  }

  const app = qlik.currApp(component);
  const properties = (await component.backendApi.getProperties());

  // If this is a master object, fetch the hyperCubeDef of the original object
  let hyperCubeDef = properties.qExtendsId
    ? (await app.getObjectProperties(properties.qExtendsId)).properties.qHyperCubeDef
    : properties.qHyperCubeDef;
  hyperCubeDef = JSON.parse(JSON.stringify(hyperCubeDef));
  hyperCubeDef.qStateName = layout.qStateName;

  return buildDataCube(hyperCubeDef, layout.qHyperCube, app);
}

export function initializeDesignList (component, layout) {
  if (component.backendApi.isSnapshot) {
    return layout.snapshotData.designList;
  }

  if (!layout.stylingfield) {
    return null;
  }

  return new Promise(resolve => {
    const app = qlik.currApp(component);
    const stylingField = app.field(layout.stylingfield);
    const listener = function () {
      const data = stylingField.rows.map(row => row.qText);
      stylingField.OnData.unbind(listener);
      resolve(data);
    };
    stylingField.OnData.bind(listener);
    stylingField.getData();
  });
}

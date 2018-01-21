var gl_canvas;
var gl_ctx;
var _position;

var _triangleVertexBuffer;
var _triangleFacesBuffer;

var _color;
var _PosMatrix;
var _MovMatrix;
var _ViewMatrix;
var _matrixProjection;
var _matrixMovement;
var _matrixView;
var animation;
var pause_animation; // Wstrzymywanie ruchu obiektu.
var dAngle;

var rotationSpeed = 0.001;
var zoomRatio = -6;

var triangleVertices = []; // Dynamiczna tablica wierzchołków.
var triangleFaces = []; // Dynamiczna tablica poligonów.

var elements = 0; // Ilość poligonów.
var vertex = 0; // Ilość wierzchołków.

var recursion = 3; // Stopień samopodobieństwa - rekurencji fraktalu.
var deformation = 0; // Stopień deformacji fraktalu.
var length = 4; // Długość boku fraktalu.

var X, Y, Z;

// Funkcja główna.
function runWebGL() {
    // Jeżeli tablice wierzchołków zawierają wcześniej utworzone elementy
    // to następuje ich zerowanie. Zapobiega to nakładaniu się kolejnych warstw
    // składowych Dywanu Sierpińskiego na siebie po zmianie parametrów rysowania.
    while (triangleVertices.length > 0)
        triangleVertices.pop();
    while (triangleFaces.length > 0)
        triangleFaces.pop();
    elements = 0;
    vertex = 0;
    // Po wywołaniu funkcji wprawiającej obiekt w ruch zatrzymanie ruchu (jeżeli wystąpiło)
    // przestanie obowiązywać.
    pause_animation = false;
    getRotation();
    gl_canvas = document.getElementById("glcanvas");
    gl_ctx = gl_getContext(gl_canvas);
    gl_initShaders();
    DrawSierpinskiCarpet(length / 2, length / 2, length, recursion);
    gl_initBuffers();
    gl_setMatrix();
    gl_draw();
}

// Osie obrotu.
function getRotation() {
    X = document.getElementById("rotateX").checked;
    Y = document.getElementById("rotateY").checked;
    Z = document.getElementById("rotateZ").checked;
}

// Zmiana zmiennej odpowiadającej za wstrzymywanie ruchu obiektu.
function pauseAnimation() {
    pause_animation = !pause_animation;
}

// Odznaczenie ruchu wokół osi obrotu i powrót obiektu do statycznej pozycji startowej.
function startedPosition() {
    X = document.getElementById('rotateX').checked = false;
    Y = document.getElementById('rotateY').checked = false;
    Z = document.getElementById('rotateZ').checked = false;
    runWebGL();
}

// Zmiana długości boku Dywanu Sierpińskiego.
function changeScale() {
    length = document.getElementById('scaleRange').value / 100;
    runWebGL();
}

// Zmiana stopnia samopodobieństwa - rekurencji Dywanu Sierpińskiego.
function changeRecursion() {
    recursion = document.getElementById("recursion-level").options[document.getElementById("recursion-level").selectedIndex].value;
    runWebGL();
}

// Zmiana stopnia deformacji.
function changeDeformation() {
    deformation = document.getElementById('deformationRange').value / 100;
    runWebGL();
}

// Pobranie kontekstu WebGL.
function gl_getContext(canvas) {
    try {
        var ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        ctx.viewportWidth = canvas.width;
        ctx.viewportHeight = canvas.height;
    } catch (e) {
    }

    if (!ctx) {
        document.write("Nieudana inicjalizacja kontekstu WebGL.");
    }
    return ctx;
}

// Shadery.
function gl_initShaders() {

    var vertexShader = "\n\
      attribute vec3 position;\n\
      uniform mat4 PosMatrix;\n\
      uniform mat4 MovMatrix;\n\
      uniform mat4 ViewMatrix; \n\
      attribute vec3 color;\n\
      varying vec3 vColor;\n\
      void main(void) {\n\
         gl_Position = PosMatrix * ViewMatrix * MovMatrix * vec4(position, 1.);\n\
         vColor = color;\n\
      }";

    var fragmentShader = "\n\
      precision mediump float;\n\
      varying vec3 vColor;\n\
      void main(void) {\n\
         gl_FragColor = vec4(vColor, 1.);\n\
      }";

    var getShader = function (source, type, typeString) {
        var shader = gl_ctx.createShader(type);
        gl_ctx.shaderSource(shader, source);
        gl_ctx.compileShader(shader);

        if (!gl_ctx.getShaderParameter(shader, gl_ctx.COMPILE_STATUS)) {
            alert("error in" + typeString);
            return false;
        }
        return shader;
    };

    var shader_vertex = getShader(vertexShader, gl_ctx.VERTEX_SHADER, "VERTEX");
    var shader_fragment = getShader(fragmentShader, gl_ctx.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = gl_ctx.createProgram();
    gl_ctx.attachShader(SHADER_PROGRAM, shader_vertex);
    gl_ctx.attachShader(SHADER_PROGRAM, shader_fragment);

    gl_ctx.linkProgram(SHADER_PROGRAM);

    _PosMatrix = gl_ctx.getUniformLocation(SHADER_PROGRAM, "PosMatrix");
    _MovMatrix = gl_ctx.getUniformLocation(SHADER_PROGRAM, "MovMatrix");
    _ViewMatrix = gl_ctx.getUniformLocation(SHADER_PROGRAM, "ViewMatrix");

    _position = gl_ctx.getAttribLocation(SHADER_PROGRAM, "position");
    _color = gl_ctx.getAttribLocation(SHADER_PROGRAM, "color");
    gl_ctx.enableVertexAttribArray(_position);
    gl_ctx.enableVertexAttribArray(_color);
    gl_ctx.useProgram(SHADER_PROGRAM);
}

// Funkcja rekurencyjna wyliczająca współrzędne składowych Dywanu Sierpińskiego:
// - współrzędne (x, y), długość boku dywanu, poziom samopodobieństwa - rekurencji.
function DrawSierpinskiCarpet(x, y, _lengthOfSide, _recursionLevel) {
    if (_recursionLevel > 0) {
        _lengthOfSide = _lengthOfSide / 3;
        _recursionLevel -= 1;
        DrawSierpinskiCarpet(x - (2 * _lengthOfSide), y, _lengthOfSide, _recursionLevel);
        DrawSierpinskiCarpet(x - _lengthOfSide, y, _lengthOfSide, _recursionLevel);
        DrawSierpinskiCarpet(x, y, _lengthOfSide, _recursionLevel);

        DrawSierpinskiCarpet(x - (2 * _lengthOfSide), y - _lengthOfSide, _lengthOfSide, _recursionLevel);
        DrawSierpinskiCarpet(x, y - _lengthOfSide, _lengthOfSide, _recursionLevel);

        DrawSierpinskiCarpet(x - (2 * _lengthOfSide), y - (2 * _lengthOfSide), _lengthOfSide, _recursionLevel);
        DrawSierpinskiCarpet(x - _lengthOfSide, y - (2 * _lengthOfSide), _lengthOfSide, _recursionLevel);
        DrawSierpinskiCarpet(x, y - (2 * _lengthOfSide), _lengthOfSide, _recursionLevel);
    }
    else {
        // Wyliczenie właściwego przesunięcia deformacji.
        var def;
        var plus_or_minus;
        if (deformation !== 0)
            def = (Math.random() % (0.1 * length)) * (deformation * 0.1);
        else
            def = 0;

        // Sprawienie, że przesunięcie w lewo i prawo występują z tym samym prawdopodobieństwem.
        plus_or_minus = Math.random();
        if (plus_or_minus < 0.5)
            def = -def;

        // Prawy-górny wierzchołek kwadratu.
        triangleVertices.push(x + def);
        triangleVertices.push(y + def);
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        if (vertex !== 0)
            vertex = vertex + 1;

        // Prawy-dolny wierzchołek kwadratu.
        triangleVertices.push(x + def);
        triangleVertices.push(y - _lengthOfSide + def);
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        vertex = vertex + 1;

        // Lewy-dolny wierzchołek kwadratu.
        triangleVertices.push(x - _lengthOfSide + def);
        triangleVertices.push(y - _lengthOfSide + def);
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        vertex = vertex + 1;

        // Lewy-górny wierzchołek kwadratu.
        triangleVertices.push(x - _lengthOfSide + def);
        triangleVertices.push(y + def);
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        triangleVertices.push(Math.random());
        vertex = vertex + 1;

        // Pierwsza połowa kwadratu (trójkąt po stronie prawej).
        triangleFaces.push(vertex - 3);
        triangleFaces.push(vertex - 2);
        triangleFaces.push(vertex - 1);

        // Druga połowa kwadratu (trójkąt po stronie lewej).
        triangleFaces.push(vertex - 3);
        triangleFaces.push(vertex - 1);
        triangleFaces.push(vertex);

        // Powiększenie ilości elementów bufora indeksów.
        elements = elements + 6;
    }
}

// Bufory.
function gl_initBuffers() {
    _triangleVertexBuffer = gl_ctx.createBuffer();
    gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _triangleVertexBuffer);
    gl_ctx.bufferData(gl_ctx.ARRAY_BUFFER, new Float32Array(triangleVertices), gl_ctx.DYNAMIC_DRAW);

    _triangleFacesBuffer = gl_ctx.createBuffer();
    gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _triangleFacesBuffer);
    gl_ctx.bufferData(gl_ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleFaces), gl_ctx.DYNAMIC_DRAW);
}

// Macierz.
function gl_setMatrix() {
    _matrixProjection = MATRIX.getProjection(40, gl_canvas.width / gl_canvas.height, 1, 100);
    _matrixMovement = MATRIX.getIdentityMatrix();
    _matrixView = MATRIX.getIdentityMatrix();

    MATRIX.translateZ(_matrixView, zoomRatio);
}

// Rysowanie.
function gl_draw() {
    // Warunek powodujący, że prędkość obrotu obiektu jest zawsze jednakowa.
    if (animation)
        window.cancelAnimationFrame(animation);

    gl_ctx.clearColor(0.0, 0.0, 0.0, 0.0);
    gl_ctx.enable(gl_ctx.DEPTH_TEST);
    gl_ctx.depthFunc(gl_ctx.LEQUAL);
    gl_ctx.clearDepth(1.0);
    var timeOld = 0;

    var animate = function (time) {
        dAngle = rotationSpeed * (time - timeOld);

        // Warunek odpowiadający za wykonanie obrotu - możliwość wstrzymania poruszania obiektu po kliknięciu
        // w odpowiedni przycisk.
        if (!pause_animation) {
            if (X)
                MATRIX.rotateX(_matrixMovement, dAngle);
            if (Y)
                MATRIX.rotateY(_matrixMovement, dAngle);
            if (Z)
                MATRIX.rotateZ(_matrixMovement, dAngle);
        }
        timeOld = time;

        gl_ctx.viewport(0.0, 0.0, gl_canvas.width, gl_canvas.height);
        gl_ctx.clear(gl_ctx.COLOR_BUFFER_BIT | gl_ctx.DEPTH_BUFFER_BIT);

        gl_ctx.uniformMatrix4fv(_PosMatrix, false, _matrixProjection);
        gl_ctx.uniformMatrix4fv(_MovMatrix, false, _matrixMovement);
        gl_ctx.uniformMatrix4fv(_ViewMatrix, false, _matrixView);

        // Fraktal 2D - 2 współrzędne jednego wierzchołka, 3 współrzędne kolorów każdego wierzchołka (RGB).
        // Konieczność zmiany parametrów odchylenia - należy rozpoznawać odpowiednie elementy tablicy triangleVertices
        // jako współrzędne wierzchołków a inne jako składowe kolorów.
        gl_ctx.vertexAttribPointer(_position, 2, gl_ctx.FLOAT, false, 4 * (2 + 3), 0);
        gl_ctx.vertexAttribPointer(_color, 3, gl_ctx.FLOAT, false, 4 * (2 + 3), 2 * 4);

        gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _triangleVertexBuffer);
        gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _triangleFacesBuffer);

        // Ilość wierzchołków przypadająca na każdy poligon * ilość poligonów - zmienna elements inkrementowana
        // podczas wykonywania funkcji rekurencyjnej obliczającej kolejne współrzędne wierzchołków fraktalu.
        gl_ctx.drawElements(gl_ctx.TRIANGLES, elements, gl_ctx.UNSIGNED_SHORT, 0);
        gl_ctx.flush();
        animation = window.requestAnimationFrame(animate);
    };

    animate(0);
}
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
var scale = 1; // Współczynnik skalowania obiektu (zmiana współrzędnych rysowania).
var rotationSpeed = 0.001;
var zoomRatio = -6;
var X, Y, Z;

// Funkcja główna.
function runWebGL() {
    // Po wywołaniu funkcji wprawiającej obiekt w ruch zatrzymanie ruchu (jeżeli wystąpiło)
    // przestanie obowiązywać.
    pause_animation = false;
    getRotation();
    gl_canvas = document.getElementById("glcanvas");
    gl_ctx = gl_getContext(gl_canvas);
    gl_initShaders();
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

// Zmiana długości boku ostrosłupa foremnego.
function changeScale() {
    scale = document.getElementById('scaleRange').value/100;
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

// Bufory.
function gl_initBuffers() {
    // Współrzędne wierzchołków ostrosłupa foremnego wyliczone
    // za pomocą wzorów Pitagorasa i wzoru na wysokość ostrosłupa.
    // Możliwość zmiany rozmiaru obiektu za pomocą współczynnika skalowania.
    var triangleVertices = [
        -1 * scale, -0.816 * scale, -0.577 * scale,
        0, 0, 1, // Kolor niebieski.
        1 * scale, -0.816 * scale, -0.577 * scale,
        0, 1, 0, // Kolor zielony,
        0, -0.816 * scale, 1.155 * scale,
        1, 0, 0, // Kolor czerwony.
        0, (1.633 - 0.816) * scale, 0,
        0.5, 0.5, 0.5 // Kolor szary.
    ];

    _triangleVertexBuffer = gl_ctx.createBuffer();
    gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _triangleVertexBuffer);
    gl_ctx.bufferData(gl_ctx.ARRAY_BUFFER, new Float32Array(triangleVertices), gl_ctx.STATIC_DRAW);

    var triangleFaces = [
        0, 1, 2, // Podstawa.
        0, 1, 3, // Ściana 1.
        1, 2, 3, // Ściana 2.
        2, 0, 3  // Ściana 3.
    ];

    _triangleFacesBuffer = gl_ctx.createBuffer();
    gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _triangleFacesBuffer);
    gl_ctx.bufferData(gl_ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleFaces), gl_ctx.STATIC_DRAW);
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

        // Ostrosłup - 3 współrzędne jednego wierzchołka, 3 współrzędne kolorów każdego wierzchołka (RGB).
        // Konieczność zmiany parametrów odchylenia - należy rozpoznawać odpowiednie elementy tablicy triangleVertices
        // jako współrzędne wierzchołków a inne jako składowe kolorów.
        gl_ctx.vertexAttribPointer(_position, 3, gl_ctx.FLOAT, false, 4 * (3 + 3), 0);
        gl_ctx.vertexAttribPointer(_color, 3, gl_ctx.FLOAT, false, 4 * (3 + 3), 3 * 4);

        gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _triangleVertexBuffer);
        gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _triangleFacesBuffer);

        // Ilość wierzchołków przypadająca na każdy poligon * ilość poligonów = 3 * 4.
        gl_ctx.drawElements(gl_ctx.TRIANGLES, 4 * 3, gl_ctx.UNSIGNED_SHORT, 0);
        gl_ctx.flush();
        animation = window.requestAnimationFrame(animate);
    };

    animate(0);
}
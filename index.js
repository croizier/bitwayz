class Bitwayz {
    static namespace = "http://www.w3.org/2000/svg"
    static dpi = 100
    static scale = 0.4
    static duration = 200
    static kinds = ["no", "ol", "or", "ob", "bl", "br"]

    constructor(
        /**@type {number}*/ width,
        /**@type {number}*/ height,
        /**@type {HTMLElement}*/ host,
    ) {
        console.assert(height >= 3)
        console.assert(width >= 5)
        console.assert(width % 2 == 1)

        this.width = width
        this.height = height
        this.host = host

        this.i = 1
        this.j = 1
        this.side = -1
        this.ballIsAtCenterOfPiece = false
        this.isInEditionMode = true

        host.append(this.createSvg())
    }

    createSvg() {
        let svg = document.createElementNS(Bitwayz.namespace, "svg")
        let svgWidth = Bitwayz.dpi + Bitwayz.dpi * this.width
        let svgHeight = Bitwayz.dpi + Bitwayz.dpi * this.height
        svg.setAttribute("width", svgWidth * Bitwayz.scale)
        svg.setAttribute("height", svgHeight * Bitwayz.scale)
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        svg.innerHTML = `
<symbol id="piece" width="200" height="200" viewBox="0 0 200 200">
    <polygon class="p1" points="0,100 100,0 200,100 100,200" />
    <polygon class="p2 i0" points="35,65 65,35 130,100 100,130" />
    <polygon class="p2 i1" points="135,35 165,65 100,130 70,100" />
    <polygon class="p2 o0" points="65,165 35,135 100,70 130,100" />
    <polygon class="p2 o1" points="135,165 165,135 100,70 70,100" />
    <line class="p3" x1="100" y1="130" x2="130" y2="100" />
</symbol>
        `
        for (let i = 0; i < this.height; i += 1) {
            for (let j = 0 + i % 2; j < this.width; j += 2) {
                let piece = document.createElementNS(Bitwayz.namespace, "use")
                piece.setAttribute("href", "#piece")
                piece.setAttribute("x", Bitwayz.dpi * j)
                piece.setAttribute("y", Bitwayz.dpi * i)
                piece.setAttribute("class", "no")
                piece.addEventListener('click', this.handleClickPiece.bind(this))
                svg.append(piece)
            }
        }

        svg.addEventListener('click', this.toggleEditionMode.bind(this))
        return svg
    }

    toggleEditionMode() {
        this.isInEditionMode = !this.isInEditionMode
        if (this.isInEditionMode) {
            this.deleteBall()
        } else {
            this.i = 1
            this.j = 1 // or else (width + 1) / 2 - 2 for left of center
            this.side = -1
            
            let spans = document.getElementsByTagName("span")
            for (let k = spans.length - 1; k >= 0; k -= 1) {
                spans[k].remove()
            }

            document.getElementsByTagName("svg")[0].append(this.newBall())
            this.moveBall()
        }
    }

    handleClickPiece(event) {
        event.stopPropagation()

        if (!this.isInEditionMode) {
            return
        }

        /**@type {SVGUseElement}*/ let target = event.target
        let j = parseInt(target.getAttribute('x')) / Bitwayz.dpi
        let i = parseInt(target.getAttribute('y')) / Bitwayz.dpi

        let kind = target.getAttribute("class")
        let k = Bitwayz.kinds.indexOf(kind)
        console.assert(k >= 0)
        let next = Bitwayz.kinds[(k + 1) % Bitwayz.kinds.length]
        target.setAttribute("class", next)
    }

    deleteBall() {
        let ball = document.getElementsByTagName("circle")[0]
        ball.remove()
    }

    newBall() {
        let ball = document.createElementNS(Bitwayz.namespace, "circle")
        ball.setAttribute("cx", Bitwayz.dpi * (this.j + 0.5 * this.side))
        ball.setAttribute("cy", Bitwayz.dpi * (this.i - 0.5))
        ball.setAttribute("r", 20)
        return ball
    }

    moveBall() {
        if (this.isInEditionMode) {
            return
        }

        let offside = this.j == 0 || this.j > this.width
        if (offside && this.i <= this.height && !this.ballIsAtCenterOfPiece) {
            this.toggleEditionMode()
            return
        }

        if (this.i > this.height) {
            this.i = 1
            this.side = - this.side
            this.j -= this.side
            
            let span = document.createElement("span")
            console.assert(this.j % 2 == 1)
            span.innerHTML = `${(this.j + 1) / 2}`
            this.host.appendChild(span)

            this.deleteBall()
            document.getElementsByTagName("svg")[0].append(this.newBall())
            setTimeout(this.moveBall.bind(this), 0)
            return
        }

        let options = {
            duration: Bitwayz.duration,
            easing: "linear",
            fill: "forwards"
        }
        let xy = this.ballIsAtCenterOfPiece
            ? this.moveFromCenter()
            : this.moveFromEdge()
        if (!xy) {
            this.toggleEditionMode()
            return
        }

        let keyframes = [{ cx: xy.x + "px", cy: xy.y + "px" }]
        let ball = document.getElementsByTagName("circle")[0]
        let animation = ball.animate(keyframes, options)
        // TODO find a callback that works on Safari
        animation.onfinish = this.moveBall.bind(this)
    }

    moveFromCenter() {
        this.ballIsAtCenterOfPiece = false
        let x = Bitwayz.dpi * this.j - Bitwayz.dpi
        let y = Bitwayz.dpi * this.i - Bitwayz.dpi
        let piece = this.host.querySelector(`use[x="${x}"][y="${y}"]`)
        console.assert(piece)
        let kind = piece.getAttribute("class")
        console.assert(Bitwayz.kinds.indexOf(kind) >= 0)

        if (kind == "no") {
            return
        }

        if (kind == "bl" || kind == "br") {
            setTimeout(() => {
                piece.setAttribute("class", kind == "bl" ? "br" : "bl")
            }, Bitwayz.duration * 0.5)
        }

        if (kind == "ol" || kind == "bl" || kind == "ob" && this.side == 1) {
            this.side = 1
        } else {
            this.side = -1
        }
        this.i += 1
        this.j -= this.side

        y += Bitwayz.dpi * 1.5
        x += Bitwayz.dpi - 0.5 * Bitwayz.dpi * this.side

        return { x, y }
    }

    moveFromEdge() {
        this.ballIsAtCenterOfPiece = true
        let x = Bitwayz.dpi * this.j
        let y = Bitwayz.dpi * this.i
        return { x, y }
    }
}

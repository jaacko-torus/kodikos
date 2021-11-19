const beforeChange = (codeMirror, change) => {
	/** @see https://discuss.codemirror.net/t/single-line-codemirror/195/2 */
	const typedNewLine =
		change.origin == "+input" &&
		typeof change.text == "object" &&
		change.text.join("") == "";

	if (typedNewLine) { return change.cancel(); }

	const pastedNewLine =
		change.origin == "paste" &&
		typeof change.text == "object" &&
		change.text.length > 1;

	if (pastedNewLine) {
		const newText = change.text.join(" ");
		return change.update(null, null, [newText]);
	}

	return null;
}

const codeMirrorGen = (query, value) => CodeMirror(document.querySelector(query), { value, mode: "javascript", theme: "ayu-dark", scrollbarStyle: "null" })

const codeMirror = {
	filter: codeMirrorGen("#container > #filter", "(w, i, a) => 5 <= w.length && w.length <= 8"),
	map: codeMirrorGen("#container > #map", "(w, i, a) => w"),
	reduce: codeMirrorGen("#container > #reduce", "(p, c, i, a) => `${p}${random([\"-\"])}${c}`"),
	result: codeMirrorGen("#container > #result", "(r) => `${random(to_a(\"0123456789\"))}${r}${random(to_a(\",._=+\"))}`"),
}

Object.entries(codeMirror).forEach(([name, codeMirror]) => {
	codeMirror.on("beforeChange", beforeChange)
})

document.getElementById("warning_opener").onclick = (e) => {
	document.getElementById("warning_opener").classList.toggle("hidden")
	document.getElementById("warning_container").classList.toggle("hidden")
}

document.getElementById("warning_container").onclick = (e) => {
	document.getElementById("warning_opener").classList.toggle("hidden")
	document.getElementById("warning_container").classList.toggle("hidden")
}

// document.getElementById("warning_clipboard").onclick = function(e) {
// 	window.localStorage.setItem("passgenExtension_hide_warning_clipboard", true)
// 	window.location.reload();
// }

const $size_min = document.querySelector("#container > #size_min")
const $size_max = document.querySelector("#container > #size_max")

document.querySelector("#options").addEventListener("click", (e) => document.querySelector("#container").classList.toggle("hidden"))

$size_min.addEventListener("input", function(e) {
	if (Number(this.value) > Number($size_max.value)) {
		$size_max.value = this.value
	}
})

$size_max.addEventListener("input", function(e) {
	if (Number(this.value) < Number($size_min.value)) {
		$size_min.value = this.value
	}
})


document.getElementById("frame").onload = function(e) {
	// Find min and max word length
	this.contentWindow.postMessage({ type: "min_max", data: null })
	
	// Password generation
	const raw_fns = Object.fromEntries(Object.entries(codeMirror)
		// can't `eval` here
		.map(([name, codeMirror]) => [name, codeMirror.getValue()])
	)
	
	const generate = (number_of_passes) => ({
		type: "generate",
		data: {
			raw_fns,
			number_of_passes,
			size_min_value: $size_min.value,
			size_max_value: $size_max.value
		}
	})
	
	// Being explicit on purpose
	
	document.querySelector("#generate_3").addEventListener("click", (e) => {
		this.contentWindow.postMessage(generate(3))
	})
	
	document.querySelector("#generate_5").addEventListener("click", (e) => {
		this.contentWindow.postMessage(generate(5))
	})
	
	document.querySelector("#generate_10").addEventListener("click", (e) => {
		this.contentWindow.postMessage(generate(10))
	})
}

let $copied_pass = null

const copy_to_clipboard = (text, success) => {
	navigator.clipboard.writeText(text).then(
		() => {
			console.log("Async: Copying to clipboard was successful!")
			success()
		},
		(err) => console.error(`Async: Could not copy text: ${err}`),
	);
}

window.onmessage = (message) => {
	const { type, data } = message.data
	
	switch (type) {
		case "min_max":
			$size_min.min = data.min
			$size_min.max = data.max - 1
			$size_max.min = data.min + 1
			$size_max.max = data.max
			break;
		case "passes":
			const $passwords = document.getElementById("passwords")
			
			// Remove styling in copied pass
			$copied_pass?.classList.remove("copied")
			
			// Replace elements
			$passwords.replaceChildren(...data.map((pass, index) => {
				// Create nodes
				const $password = document.createElement("div")
				$password.classList.add("password")
				
				const $pass_copy = document.createElement("button")
				$pass_copy.id = `pass${index}_copy`
				$pass_copy.type = "button"
				
				const $svg_object = document.createElement("object")
				$svg_object.data = "clipboard.svg"
				$svg_object.type = "image/svg+xml"
				$svg_object.innerText = "Clipboard"
				
				const $pass = document.createElement("input")
				$pass.id = `pass${index}`
				$pass.type = "text"
				$pass.value = pass
				
				// Group nodes / create hierarchy
				$pass_copy.appendChild($svg_object)
				$password.append($pass_copy, $pass)
				
				// Add events
				$pass_copy.onclick = (e) => {
					// Copy to clipboard
					copy_to_clipboard($pass.value, () => {
						// On success, style
						$copied_pass?.classList.remove("copied")
						$copied_pass = $pass
						$copied_pass.classList.add("copied")
					})
				}
				
				return $password
			}))
			
			break
	}
}

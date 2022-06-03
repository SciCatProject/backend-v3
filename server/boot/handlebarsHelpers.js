"use strict";
// This file support rendering of email template
const Handlebars = require("handlebars");
const unwrapJSON = (json)=> {
  if (typeof json === "boolean") {
    return json ? "Yes" : "No";
  }
  if (typeof json === "number" || typeof json === "string") {
    return json;
  }
  if (Array.isArray(json) && json.length === 0) return "Empty list";
  if (Array.isArray(json)) {
    return new Handlebars.SafeString(
      "<ul style='padding-left: 1em'>" +
            json
              .map(
                (elem) =>
                  "<li style='margin-bottom: 1em'>" + unwrapJSON(elem) + "</li>"
              )
              .join("") +
            "</ul>"
    );
  }
  if (typeof json === "object") {
    return Object.keys(json)
      .map((key) => {
        return formatCamelCase(key) + ": " + unwrapJSON(json[key]);
      })
      .join("<br/>");
  }
  return "Not specified";
};

const formatCamelCase = (camelCase) => {
  const match = camelCase.replace(/([A-Z])/g, " $1");
  const words = match.charAt(0).toUpperCase() + match.slice(1);
  return words;
};

Handlebars.registerHelper("unwrapJSON", (json) => {
  return unwrapJSON(json);
});

Handlebars.registerHelper("keyToWord", (string) => {
  return formatCamelCase(string);
});

Handlebars.registerHelper("eq", function(a, b) {
  return a === b;
});

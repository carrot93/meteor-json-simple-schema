JSONSchema = function(schema, options) {
	var root = this;

	if (typeof schema !== 'object') {
		throw new Error('schema parameter must be an object');
	}

	var jsonSchema = schema;

	this.toSimpleSchema = function toSimpleSchema() {
		var props = jsonSchema.properties || jsonSchema;
		var simpleSchema = translateProperties(props, getRequiredFromProperty(jsonSchema));
		return new SimpleSchema(simpleSchema);
	}

	function translateProperties(properties, required) {
		var schema = {};

		_.each(properties, function(prop, key) {
			var ssProp = {};
			addRules(ssProp, prop, required.indexOf(key) !== -1);
			schema[key] = ssProp;

			var subProps = getSubPropertiesFromProperty(prop);

			if (subProps) {
				var subSchema = translateProperties(subProps, getRequiredFromProperty(prop));

				_.each(subSchema, function(subProp, subKey) {
					schema[key + '.' + (prop.type === 'array' ? '$.' : '') + subKey] = subProp;
				});
			}
		});

		return schema;
	}

	function getTypeFromProperty(prop) {
		var propType = prop.type === 'array' ? prop.items.type : prop.type;
		var format = prop.format;
		var ssType = String;

		switch (propType) {
			case 'integer':
			case 'number':
				ssType = Number;
				break;
			case 'boolean':
				ssType = Boolean;
				break;
			case 'object':
				ssType = Object;
				break;
			default:
				if (format === 'date' || format === 'date-time') {
					ssType = Date;
				} else {
					ssType = String;
				}
				break;
		}

		return (prop.type === 'array' ? [ssType] : ssType);
	}

	function getSubPropertiesFromProperty(prop) {
		if (prop.type === 'object' && prop.properties) {
			return prop.properties;
		} else if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties) {
			return prop.items.properties;
		}

		//TODO: Add support to get properties from $ref definition.

		return null;
	}

	function getRequiredFromProperty(prop) {
		if (prop.type === 'object' && prop.properties) {
			return prop.required || [];
		} else if (prop.type === 'array' && prop.items && prop.items.type === 'object' && prop.items.properties) {
			return prop.items.required || [];
		}

		//TODO: Add support to get required properties from $ref definition.

		return [];
	}

	var translationMap = {
		description: 'label',
		minimum: 'min',
		maximum: 'max',
		exclusiveMinimum: 'exclusiveMin',
		exclusiveMaximum: 'exclusiveMax',
		minLength: 'min',
		maxLength: 'max',
		'enum': 'allowedValues',
		minItems: 'minCount',
		maxItems: 'maxCount',
		'default': 'defaultValue'
	}

	function addRules(target, source, isRequired) {
		target.type = getTypeFromProperty(source);

		_.each(translationMap, function(sKey, jKey) {
			if (typeof source[jKey] !== 'undefined') {
				target[sKey] = source[jKey];
			}
		});

		target.optional = !isRequired;

		if (source.pattern) {
			target.regEx = new RegExp(source.pattern);
		}

		if (!source.pattern && source.format === 'email') {
			target.regEx = SimpleSchema.RegEx.Email;
		} else if (!source.pattern && (source.format === 'host-name' || source.format === 'hostname')) {
			target.regEx = SimpleSchema.RegEx.Domain;
		} else if (!source.pattern && source.format === 'ipv4') {
			target.rexEx = SimpleSchema.RegEx.IPv4;
		} else if (!source.pattern && source.format === 'ipv6') {
			target.rexEx = SimpleSchema.RegEx.IPv6;
		} else if (source.format === 'date-time') {
			setAutoformInputType(target, 'datetime');
		} else if (source.type === 'number' || (source.type === 'array' && source.items && source.items.type === 'number')) {
			target.decimal = true;
		}
	}

	function setAutoformInputType(target, type) {
		if (!target.autoform) {
			target.autoform = {}
		}

		if (!target.autoform.afFieldInput) {
			target.autoform.afFieldInput = {};
		}

		target.autoform.afFieldInput.type = type;
	}
};


const Logger				= require('@whi/stdlog');

class Isolate {
    /**
     * Isolate the environment context when running `eval`
     *
     * @class Isolate
     *
     * @param {object} constants	- Initialize with predefined constants
     *
     * @return {Isolate} instance of Isolate class
     */
    constructor( constants, opts = {} ) {
	this.constants			= {};
	this.debug			= opts.debug || false;
	this.log			= Logger('isolate', { level: opts.logLevel || 'fatal' });

	if ( constants ) {
	    this.log.debug("Defining constants: %s", Object.keys(this.constants) );
	    for (let [k,v] of Object.entries( constants )) {
		this.constant( k, v );
	    }
	}
	else
	    this.buildContext();
    }

    _wrapCTX( fn ) {
	const self			= this;
	return function(...args) {
	    if ( args.length !== fn.length-1 && self.debug === true )
		self.log.warn("Number of arguments %d !== %d function arguments", args.length, fn.length );
	    return fn.call(this, self.constants, ...args);
	}
    }

    buildContext() {
	const self			= this;
	const keys			= Object.keys(this.constants);
	const contextFnString		= [
	    '(function ( '+ keys.join(', ') +' ) {',
	    '    return (function ( command, isAsync ) {',
	    '        // context( ' + keys.join(', ') + ' )',
	    '        try {',
	    '            self.log.debug("eval( %s )", command );',
	    '            return eval( command );',
	    '        } catch(e) {',
	    '            if( isAsync === true ) return Promise.reject(e); else throw e;',
	    '        }',
	    '    });',
	    '}).apply( this, keys.map(k => this.constants[k]) );',
	].join("\n");

	this._ctx			= eval( contextFnString );
    }

    /**
     * Create a context
     *
     * `this.constants` is expanded so that the keys become variables for the command eval.  If the
     * constants are changed, `context` must be recalled to include the new constants.
     *
     * @param {object} data		- Value to be used as `this` at runtime
     *
     * @return {contextCallback} Command evaluator wrapped in context
     */
    context( data ) {
	/**
	 * Run the given command in the created context
	 *
	 * @callback contextCallback
	 *
	 * @param {string} command	- String to be evaluated
	 *
	 * @return {*} Result of `eval( command )`
	 */
	const self			= this;
	const ctx			= function () {
	    self.log.silly("Context function: %s", self._ctx );
	    self.log.debug("Running context command '%s' with data: %s", arguments[0], data );
	    return self._ctx.apply( data, arguments );
	}
	ctx.async			= cmd => ctx(cmd, true);
	return ctx;
    }

    /**
     * Register a constant
     *
     * `name` must be a valid variable name.  Tested against regex `/^[$a-z_][$_a-z0-9]*$/i`
     *
     * @param {string} name		- Variable name defined in context
     * @param {*} value			- The constants value
     *
     */
    constant( name, value ) {
	let root			= this.constants;
	let root_var			= name;

	if ( name.includes('.') || name.includes('[') ) {
	    const matches		= name.match(/^([^\.\[]+)|\.([^\.\[]+)|\["([^"]+)"\]|\['([^']+)'\]|\[(\d+)\]/g);
	    root_var			= matches.shift();
	    const keys			= matches.map(key => {
		return key[0] === '.'
		    ? key.slice(1)
		    : key.slice(2,-2);
	    });
	    const last			= keys.pop();
	    keys.unshift(root_var);

	    for (let key of keys) {
		if ( root[key] === null )
		    throw Error("Key '"+ key +"' is already used by 'null'");

		if ( root[key] === undefined )
		    root		= root[key] = {};
		else if ( root[key] instanceof Object )
		    root		= root[key];
		else
		    throw Error("Key '"+ key +"' is not of type object and cannot be assigned values");
	    }

	    name			= last;
	}

	if ( !(/^[$a-z_][$_a-z0-9]*$/i).test(root_var) )
	    return console.error("Invalid variable name: " + root_var);

	this.log.debug("%-15.15s ? %s || %s", name, typeof value, value.prototype );
	if ( typeof value === 'function'
	     && !value.toString().startsWith('class')
	     && ( !value.prototype || Object.keys(value.prototype).length === 0 ) ) {
	    this.log.debug("Wrapping '%s' with CTX arg", name );
	    value			= this._wrapCTX( value );
	}
	
	// The expression `({ [name]: fn })[name]` will ensure that when `value` is a function
	// expression, its `.name` will default to the given `name`.
	root[name]			= ({ [name]: value })[name];

	this.buildContext();
    }

    /**
     * Run command in a context
     *
     * Shortcut for `this.context( data )( command )`.
     *
     * @param {string} command		- String to be evaluated
     * @param {object} data		- Value to be used as `this`
     *
     * @return {*} Result of `eval( command )`
     *
     */
    command( command, data ) {
	return Isolate.context( data )( command );
    }

    /**
     * Register constant in default instance
     *
     * Shortcut to `defaultIsolater.constant( name, value )`. Allows running Isolate without
     * creating an instance.
     *
     * @static
     *
     * @param {string} name		- Variable name defined in context
     * @param {*} value			- The constants value
     *
     */
    static constant( name, value ) {
	return defaultIsolater.constant( name, value );
    }

    /**
     * Create a context from the default instance
     *
     * Shortcut to `defaultIsolater.context( data )`. Allows running Isolate without
     * creating an instance.
     *
     * @static
     *
     * @param {object} data		- Value to be used as `this` at runtime
     *
     * @return {contextCallback} Command evaluator wrapped in context
     *
     */
    static context( data ) {
	return defaultIsolater.context( data );
    }

    /**
     * Run command in a context of the default instance
     *
     * Shortcut to `defaultIsolater.context( data )( command )`. Allows running Isolate without
     * creating an instance.
     *
     * @static
     *
     * @param {string} command		- String to be evaluated
     * @param {object} data		- Value to be used as `this`
     *
     * @return {*} Result of `eval( command )`
     *
     */
    static command( command, data ) {
	return Isolate.context( data )( command );
    }
}

const defaultIsolater			= new Isolate();
Isolate.defaultIsolater			= defaultIsolater;

module.exports = Isolate;

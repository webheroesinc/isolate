
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
    constructor( constants ) {
	this.constants			= {};

	if ( constants ) {
	    for (let [k,v] of Object.entries( constants )) {
		this.constant( k, v );
	    }
	}
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
	const keys			= Object.keys(this.constants);
	const contextFnString		= [
	    '(function ( '+ keys.join(', ') +' ) {',
	    '    const ctx = (function ( command, isAsync ) {',
	    '        try {',
	    '            return eval( command );',
	    '        } catch(e) {',
	    '            if( isAsync === true ) return Promise.reject(e); else throw e;',
	    '        }',
	    '    }).bind( this );',
	    '    ctx.async = cmd => ctx(cmd, true);',
	    '    return ctx;',
	    '}).apply( data, keys.map(k => this.constants[k]) );',
	].join("\n");

	/**
	 * Run the given command in the created context
	 *
	 * @callback contextCallback
	 *
	 * @param {string} command	- String to be evaluated
	 *
	 * @return {any} Result of `eval( command )`
	 */
	return eval( contextFnString );
    }

    /**
     * Register a constant
     *
     * `name` must be a valid variable name.  Tested against regex `/^[$a-z_][$_a-z0-9]*$/i`
     *
     * @param {string} name		- Variable name defined in context
     * @param {any} value		- The constants value
     *
     */
    constant( name, value ) {
	if ( !(/^[$a-z_][$_a-z0-9]*$/i).test(name) )
	    return console.error("Invalid variable name: " + name);
	
	// The expression `({ [name]: fn })[name]` will ensure that when `value` is a function
	// expression, its `.name` will default to the given `name`.
	this.constants[name]		= ({ [name]: value })[name];
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
     * @param {any} value		- The constants value
     *
     */
    static constant( name, value ) {
	return defaultIsolater.constant( name, value );
    }

    /**
     * Run command in default context
     *
     * Shortcut to `defaultIsolater.context( data )( command )`. Allows running Isolate without
     * creating an instance.
     *
     * @static
     *
     * @param {string} command		- String to be evaluated
     * @param {object} data		- Value to be used as `this`
     *
     * @return {any} Result of `eval( command )`
     *
     */
    static command( command, data ) {
	return defaultIsolater.context( data )( command );
    }
}

const defaultIsolater			= new Isolate();

module.exports = Isolate;

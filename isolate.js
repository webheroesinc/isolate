
class Isolate {
    constructor( methods ) {
	this.methods			= {};

	if ( methods ) {
	    for (let [k,v] of Object.entries( methods )) {
		this.method( k, v );
	    }
	}
    }

    context( data ) {
	/*
	 * Create a context with `data` as `this`.
	 *
	 * `this.methods` is expanded so that the keys become variables for the command eval.  If
	 * `this.methods` are changed, `context` must be recalled to include the new methods.
	 *
	 */
	const contextFnString		= [
	    '(function ( '+ Object.keys(this.methods).join(', ') +' ) {',
	    '    const ctx = (function ( command, isAsync ) {',
	    '        try {',
	    '            return eval( command );',
	    '        } catch(e) {',
	    '            if( isAsync === true ) return Promise.reject(e); else throw e;',
	    '        }',
	    '    }).bind( this );',
	    '    ctx.async = cmd => ctx(cmd, true);',
	    '    return ctx;',
	    '}).apply( data, Object.values(this.methods) );',
	].join("\n");

	return eval( contextFnString );
    }

    method( name, fn ) {
	/*
	 * The expression `({ [name]: fn })[name]` will ensure that the function expression will
	 * default to the `name`.  So that `this.methods[name].name` will equal the given `name`.
	 *
	 * `name` must be a valid variable name.  Tested against regex `/^[$a-z_][$_a-z0-9]*$/i`
	 *
	 */
	if ( !(/^[$a-z_][$_a-z0-9]*$/i).test(name) )
	    return console.error("Invalid variable name: " + name);
	
	this.methods[name]		= ({ [name]: fn })[name];
    }

    /*
     * Static methods allow running without creating a new instance.
     *
     */
    static method( name, fn ) {
	return defaultIsolater.method( name, fn );
    }

    static command( command, data ) {
	return defaultIsolater.context( data )( command );
    }
}

const defaultIsolater			= new Isolate();

module.exports = Isolate;

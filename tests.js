
const Isolate				= require('./isolate.js');
const expect				= require('chai').expect;

describe("Isolate", function() {
    
    const constants			= {
	"length":		function ( ctx, str ) { return str.length; },
	"lengthThrow":		function ( ctx, str ) { throw Error("Bad"); },
	"asyncLength":		async function ( ctx, str ) { return str.length; },
	"asyncLengthThrow":	async function ( ctx, str ) { throw Error("Bad"); },
    };
    const data				= {
	name: "Mark Twain",
    };
    const isolater			= new Isolate( constants );
    const ctx				= isolater.context( data );


    it("should test quickrun command", function () {
	expect( Isolate.command("this.name", data) ).to.equal( "Mark Twain" );

	const ctx			= Isolate.context( data );
	expect( ctx("this.name") ).to.equal( "Mark Twain" );
    });
    it("should test quickrun command with constant", function () {
	Isolate.constant( "length", constants['length'] );
	
	expect( Isolate.command("length( this.name )", data) ).to.equal( 10 );
    });


    it("should test method", function () {
	expect( ctx("length( this.name )") ).to.equal( 10 );
    });
    it("should test method throw", function () {
	try {
	    ctx("lengthThrow( this.name )");
	} catch(e) {
	    expect( e.message ).to.equal("Bad");
	    return;
	}
	throw Error("Should have failed before this point");
    });


    it("should test async method", async function () {
	expect( await ctx.async("asyncLength( this.name )") ).to.equal( 10 );
    });
    it("should test async method throw", async function () {
	try {
	    await ctx.async("asyncLengthThrow( this.name )");
	} catch(e) {
	    expect( e.message ).to.equal("Bad");
	    return;
	}
	throw Error("Should have failed before this point");
    });
    it("should test async method throw using .then()", function () {
	return ctx.async("lengthThrow( this.name )").then(_ => {
	    throw Error("Should have failed before this point");
	}, e => {
	    expect( e.message ).to.equal("Bad");
	});
    });
    

    it("should test non-async method expecting async", async function () {
	expect( await ctx.async("length( this.name )") ).to.equal(10);
    });
    it("should test non-async method throw expecting async", async function () {
	try {
	    await ctx.async("lengthThrow( this.name )");
	} catch(e) {
	    expect( e.message ).to.equal("Bad");
	    return;
	}
	throw Error("Should have failed before this point");
    });
    it("should test non-async method throw expecting async using .then()", function () {
	return ctx.async("lengthThrow( this.name )").then(_ => {
	    throw Error("Should have failed before this point");
	}, e => {
	    expect( e.message ).to.equal("Bad");
	});
    });
    

    it("should test async method expecting non-async", async function () {
	expect( ctx("asyncLength( this.name )") ).is.a('Promise');
    });
    it("should test async method throw expecting non-async", async function () {
	expect( ctx("asyncLengthThrow( this.name )").catch(_ => null) ).is.a('Promise');
    });

    
    it("should test methods are only in their own instance", function () {
	const isolater2			= new Isolate({
	    "count": function ( ctx, str, letter ) { return (str.split(letter).length - 1); },
	});
	const ctx2			= isolater2.context( data );

	try {
	    expect( ctx2("count( this.name, 'a' )") ).to.equal(2);
	    ctx2("length( this.name )");
	} catch (e) {
	    expect( e.message ).to.equal("length is not defined");
	    return;
	}
	throw Error("Should have failed before this point");
    });

    
    it("should test method paths", function () {
	const isolater			= new Isolate({
	    "count": function ( ctx, str, letter ) { return (str.split(letter).length - 1); },
	});

	isolater.constant( "is.constructorType", function ( ctx, v, name ) {
	    return typeof v === 'object' ? v.constructor.name === name : false;
	});
	isolater.constant( "is.string", function ( ctx, v ) {
	    return typeof v === 'string' || ctx.is.constructorType( v, 'String' );
	});
	isolater.constant( "is.number", function ( ctx, v ) {
	    return typeof v === 'number' || ctx.is.constructorType( v, 'Number' );
	});

	const ctx			= isolater.context({
	    "string":		"Wayne Gretzky",
	    "objectString":	new String("Wayne Gretzky"),
	    "number":		99,
	    "objectNumber":	new Number(99),
	});

	expect( ctx("is.string( this.string )") ).to.be.true;
	expect( ctx("is.string( this.objectString )") ).to.be.true;
	expect( ctx("is.number( this.number )") ).to.be.true;
	expect( ctx("is.number( this.objectNumber )") ).to.be.true;
    });

    
    it("should test class constant", function () {

	class Player {
	    constructor(name, number) {
		this.name		= name;
		this.number		= number;
	    }

	    hello() {
		return "Hello, my name is " + this.name;
	    }
	}

	const isolater			= new Isolate({
	    Player,
	});

	const ctx			= isolater.context({
	    "string":		"Wayne Gretzky",
	    "objectString":	new String("Wayne Gretzky"),
	    "number":		99,
	    "objectNumber":	new Number(99),
	});

	expect( ctx("new Player( this.string, this.number )") ).to.be.an.instanceof( Player );
    });

    
    it("should test constant function class using prototype", function () {

	function Player(name, number) {
	    this.name		= name;
	    this.number		= number;
	}
	Player.prototype.hello	= function() {
	    return "Hello, my name is " + this.name;
	}

	const isolater			= new Isolate({
	    Player,
	});
	
	isolater.log.info("Type of class is %s, prototype length: %d", typeof Player, Object.keys(Player.prototype).length );

	const ctx			= isolater.context({
	    "string":		"Wayne Gretzky",
	    "objectString":	new String("Wayne Gretzky"),
	    "number":		99,
	    "objectNumber":	new Number(99),
	});

	expect( ctx("new Player( this.string, this.number )") ).to.be.an.instanceof( Player );
    });

});

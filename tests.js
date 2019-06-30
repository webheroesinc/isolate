
const Isolate				= require('./isolate.js');
const expect				= require('chai').expect;

describe("Isolate", function() {
    const constants			= {
	"length":		function ( str ) { return str.length; },
	"lengthThrow":		function ( str ) { throw Error("Bad"); },
	"asyncLength":		async function ( str ) { return str.length; },	
	"asyncLengthThrow":	async function ( str ) { throw Error("Bad"); },	
    };
    const data				= {
	name: "Mark Twain",
    };
    const isolater			= new Isolate( constants );
    const ctx				= isolater.context( data );


    it("should test quickrun command", function () {
	expect( Isolate.command("this.name", data) ).to.equal( "Mark Twain" );
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
	    "count": function ( str, letter ) { return (str.split(letter).length - 1); },
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
});

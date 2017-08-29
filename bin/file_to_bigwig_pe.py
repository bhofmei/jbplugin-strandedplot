import sys, math, glob, multiprocessing, subprocess, os, bisect, random

# Usage: file_to_bigwig_pe.py [-keep] [-scale[=cntl_chrm]] [-strand] [-sort] [-index] [-p=num_proc] <chrm_file> <bam_file | bed_file> [bam_file | bed_file]*

NUMPROC=1

def processInputs( chrmFileStr, bedFileStrAr, keepTmp, scaleVal, isStrand, isSort, isIndex, numProc, isPrint ):
	if len(bedFileStrAr)==1:
		print( 'Input File: {:s}'.format( bedFileStrAr[0] ) )
	else:
		print( 'Input Files: {:s}'.format( ', '.join( bedFileStrAr ) ) )
	print('Chromosome sizes file: {:s}\nKeep temporary files: {:s}\nScale by: {:s}\nStranded: {:s}\nSorting: {:s}\nCreate BAM index: {:s}'.format( chrmFileStr, str( keepTmp ), ('library size' if scaleVal == -1 else 'None' if scaleVal == 1 else scaleVal), str(isStrand), str(isSort), str( isIndex ) ) )
	if len(bedFileStrAr) < numProc:
		numProc = len(bedFileStrAr)
	print( 'Begin processing {:d} files with {:d} processors'.format( len(bedFileStrAr), numProc ) )
	pool = multiprocessing.Pool( processes=numProc )
	results = [ pool.apply_async( processFile, args=(bedFileStr, chrmFileStr, keepTmp, scaleVal, isStrand, isSort, isIndex, isPrint) ) for bedFileStr in bedFileStrAr ]
	suc = [ p.get() for p in results ]
	print( 'Done.' )

def processFile( bedFileStr, chrmFileStr, keepTmp, scaleVal, isStrand, isSort, isIndex, isPrint ):
	baseDir = os.path.dirname( bedFileStr )
	ind = bedFileStr.rfind('.')
	baseName = bedFileStr[:ind]
	fileBase = os.path.basename( bedFileStr )
	rmFile = []

	# check for bam file -> convert to bed
	if bedFileStr.endswith( '.bam' ):
		# check bam index
		if isIndex and os.path.isfile( bedFileStr + '.bai' ) == False:
			if isPrint:
				print( ' indexing {:s}'.format( fileBase ) )
			indCommand = "samtools index {:s}".format( bedFileStr )
			subprocess.call( indCommand, shell=True )
		if isPrint:
			print( ' converting {:s} to bed'.format( fileBase ) )
		bamFileStr = bedFileStr
		bedFileStr = '{:s}.bed'.format( baseName)
		command = 'bedtools bamtobed -i {:s} > {:s}'.format( bamFileStr, bedFileStr )
		subprocess.call( command, shell=True )
		rmFile += [ bedFileStr ]

	# get scale value if necessary
	if scaleVal != 1 and isPrint:
		print( ' computing scale value for {:s}'.format( fileBase ) )
	if scaleVal == -1:
		baseName += '_scale-lib'
		scaleVal = getLibraryScaleValue( bedFileStr )
	elif scaleVal != 1:
		oldScale = scaleVal
		scaleVal = getControlScaleValue( bedFileStr, scaleVal )
		if scaleVal != 1:
			baseName += '_scale-{:s}'.format( oldScale.lower() )

	# bed to bedGraph
	if isStrand:
		bedGraphFileAr = convertToBedGraphStrand( bedFileStr, chrmFileStr, baseName, scaleVal, isPrint )
	else:
		bedGraphFileAr = convertToBedGraph( bedFileStr, chrmFileStr, baseName, scaleVal, isPrint )

	rmFile += bedGraphFileAr
	bigWigFileAr = []
	for bedGraphFile in bedGraphFileAr:
		# sort if necessary
		if isSort:
			sortBedFile( bedGraphFile, isPrint )
		# convert to bigwig
		bigWigFile = convertToBigWig( bedGraphFile, chrmFileStr, isPrint )
		bigWigFileAr += [bigWigFile]

	if keepTmp == False:
		if isPrint:
			print( ' removing temporary files' )
		for f in rmFile:
			os.remove(f)
	if isPrint:
		print( ' output written to {:s}'.format( ' & '.join(bigWigFileAr) ) )

def getLibraryScaleValue( bedFileStr ):
	command = 'wc -l {:s}'.format( bedFileStr )
	readCountStr = subprocess.check_output( command, shell=True, universal_newlines = True )
	return float( readCountStr.split()[0] ) / 1000000

def getControlScaleValue( bedFileStr, controlChrm ):
	command = "grep -cw '{:s}' {:s}".format( controlChrm, bedFileStr )
	try:
		readCountStr = subprocess.check_output( command, shell=True, universal_newlines = True )
	except subprocess.CalledProcessError:
		print( 'WARNING: for {:s}, no reads mapped to control chromosome {:s}...scaling will not be used'.format( bedFileStr, controlChrm) )
		return 1.0

	readCount = int(readCountStr.split()[0])
	if readCount == 0:
		print( 'WARNING: for {:s}, no reads mapped to control chromosome {:s}...scaling will not be used'.format( bedFileStr, controlChrm) )
		return 1.0
	else:
		return float( readCount ) / 1000000

def sortBedFile( bedFileStr, isPrint ):
	if isPrint:
		print( ' sorting bedGraph', os.path.basename(bedFileStr) )
	command = 'bedSort {:s} {:s}'.format( bedFileStr, bedFileStr )
	subprocess.call( command, shell=True )

def convertToBedGraph( bedFileStr, chrmFileStr, baseName, scaleVal, isPrint ):
	if isPrint:
		print( ' creating bedGraph of {:s}'.format( os.path.basename(bedFileStr) ) )
	bedGraphFile = '{:s}.bedGraph'.format( baseName )
	command = 'bedtools genomecov -bga -scale {:.2f} -i {:s} -g {:s} > {:s}'.format(scaleVal, bedFileStr, chrmFileStr, bedGraphFile )
	subprocess.call( command, shell=True )
	return [bedGraphFile]

def convertToBedGraphStrand( bedFileStr, chrmFileStr, baseName, scaleVal, isPrint ):
	if isPrint:
		print( ' creating strand-specific bedGraphs of {:s}'.format( os.path.basename(bedFileStr) ) )
	bedGraphFilePlus = '{:s}.bedGraph.plus'.format( baseName )
	bedGraphFileMinus = '{:s}.bedGraph.minus'.format( baseName )

	command = 'bedtools genomecov -bga -strand + -scale {:.2f} -i {:s} -g {:s} > {:s}'.format(scaleVal, bedFileStr, chrmFileStr, bedGraphFilePlus )
	subprocess.call( command, shell=True )
	command = 'bedtools genomecov -bga -strand - -scale {:.2f} -i {:s} -g {:s} > {:s}'.format(scaleVal, bedFileStr, chrmFileStr, bedGraphFileMinus+'.tmp' )
	subprocess.call( command, shell=True )
	# negative strand -> negative scores
	negativeBedGraph( bedGraphFileMinus, bedGraphFileMinus + '.tmp' )
	os.remove( bedGraphFileMinus + '.tmp' )
	return [bedGraphFilePlus, bedGraphFileMinus]

def negativeBedGraph( bedGraphFileMinus, bedGraphTmp ):

	tmpFile = open( bedGraphTmp, 'r' )
	bedGraphFile = open( bedGraphFileMinus, 'w' )

	for line in tmpFile:
		lineAr = line.rstrip().split( '\t' )
		if len(lineAr) > 3:
			lineAr[3] = '-'+lineAr[3]
		bedGraphFile.write( '{:s}\n'.format( '\t'.join(lineAr) ) )
	tmpFile.close()
	bedGraphFile.close()

def convertToBigWig( bedGraphStr, chrmFileStr, isPrint ):

	if isPrint:
		print( ' converting {:s} to bigWig'.format( os.path.basename( bedGraphStr) ) )
	bigWigStr = bedGraphStr.replace( '.bedGraph', '.bw' )
	# bedGraphToBigWig in.bedGraph chrom.sizes out.bw
	command = 'bedGraphToBigWig {:s} {:s} {:s}'.format( bedGraphStr, chrmFileStr, bigWigStr )
	subprocess.call( command, shell=True )
	return bigWigStr

def parseInputs( argv ):
	keepTmp = False
	scaleVal = 1
	isStrand = False
	isSort = False
	isIndex = False
	isPrint = True

	numProc = NUMPROC
	startInd = 0
	for i in range(min(7,len(argv)-2)):
		if argv[i] == '-keep':
			keepTmp = True
			startInd += 1
		elif argv[i] == '-q':
			isPrint = False
			startInd += 1
		elif argv[i].startswith('-scale'):
			if argv[i] == '-scale':
				scaleVal = -1
			elif len(argv[i]) > 7:
				scaleVal = argv[i][7:]
			else:
				print( 'WARNING: scale value is incorrect...not scaling' )
			isScale = True
			startInd += 1
		elif argv[i] == '-strand':
			isStrand = True
			startInd += 1
		elif argv[i] == '-sort':
			isSort = True
			startInd += 1
		elif argv[i] == '-index':
			isIndex = True
			startInd += 1
		elif argv[i].startswith( '-p=' ):
			try:
				numProc = int( argv[i][3:] )
			except ValueError:
				print( 'WARNING: number of processors must be integer...using default', NUMPROC )
				numProc = NUMPROC
			startInd += 1
		elif argv[i] in [ '-h', '--help', '-help' ]:
			printHelp()
			exit()
		elif argv[i].startswith( '-' ):
			print( 'ERROR: {:s} is not a valid option'.format( argv[i] ) )
			exit()

	chrmFileStr = argv[startInd]
	bedFileStrAr = []
	for j in range(startInd+1, len(argv)):
		bedFileStrAr += [ argv[j] ]

	processInputs( chrmFileStr, bedFileStrAr, keepTmp, scaleVal, isStrand, isSort, isIndex, numProc, isPrint )

def printHelp():
	print ("Usage:\tpython3 file_to_bigwig_pe.py [-q] [-h] [-keep] [-scale | -scale=chrm]\n\t[-strand] [-sort] [-p=num_proc] <chrm_file> <bam_file |\n\tbed_file> [bam_file | bed_file]*")
	print( 'Convert BED/BAM file to bigWig format for coverage view' )
	print( 'Note: bedtools, bedGraphToBigWig, samtools, and bedSort programs must be in the path' )
	print( 'Required:' )
	print( 'chrm_file\ttab-delimited file with chromosome names and lengths\n\t\ti.e. fasta index file' )
	print( 'bam_file\tbam file that already has been indexed, i.e. file.bam.bai' )
	print( 'bed_file\tBED formatted file' )
	print( 'Optional:' )
	print( '-h\t\tprint this help message and exit' )
	print( '-q\t\tquiet;do not print progress' )
	print( '-keep\t\tkeep intermediate files' )
	print( '-scale\t\tscale the values by library size (million mapped reads)' )
	print( '-scale=chrm\tscale the values by number of reads in control chrm specified' )
	print( '-strand\t\toutput reads from plus and minus strand to separate files' )
	print( '-sort\t\tsort bedgraph; use when bigwig conversion fails' )
	print( '-index\t\tcreate BAM index if it does not already exist' )
	print( '-p=num_proc\tnumber of processors to use [default 1]' )

if __name__ == "__main__":
	if len(sys.argv) < 3 :
		printHelp()
	else:
		parseInputs( sys.argv[1:] )

import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Just a class providing some utility methods in the form of public static ones
 * @author Lorenzo Bellomo
 *
 */
public class Utils {
	
	/* private fields */
	private static MessageDigest messageDigest;
	private static Random rand;
	
	static {
		// First time, when the class gets loaded, I load the SHA1 instance
		try {
			messageDigest = MessageDigest.getInstance("SHA1");
		} catch (NoSuchAlgorithmException e) {
			e.printStackTrace();
		}
		rand = new Random();
	}
	
	/**
	 * this method takes a list (the current kBest), the potential new better
	 * nodes, and the target id of the query
	 * @param kClosest is the current best k contacts known
	 * @param toAdd is the new list of potential candidates
	 * @param k is the maximum amount of elements
	 * @param id the target id of the query
	 */
	public static void updateKClosest(List<Node> kClosest, List<Node> toAdd, BigInteger id, long k) {
		// I add all the nodes except duplicates
		for(Node n : toAdd) {
			if(! kClosest.contains(n))
				kClosest.add(n);
		}
		
		// I sort the collection and take the best k
		kClosest = kClosest.stream()
			.sorted((n1, n2) -> (n1.getId().xor(id).compareTo(n2.getId().xor(id))))
			.limit(k)
			.collect(Collectors.toList());		
		
	}

	/**
	 * This method returns the node that is the closest to id in a list
	 * @param kClosest the list of potential closest nodes
	 * @param id the target id 
	 * @param m the number of bits m, system wide parameter
	 * @return the closest node
	 */
	public static Node findClosestNode(List<Node> kClosest, BigInteger id, long m) {

		// Distance is 2^m at the beginning, so any distance I find later is lesser
		
		BigInteger twoToM = BigInteger.valueOf((long) 2);
		twoToM = twoToM.pow((int) m);
		
		BigInteger distance = twoToM;
		Node closest = null;
		for (Node n : kClosest) {
			// I compute the distance, if better then the one before then I update the 
			// closest known node
			BigInteger xorDistance = (id.xor(n.getId()));
			if (xorDistance.compareTo(distance) <= 0) {
				closest = n;
				distance = xorDistance;
			}
		}
		return closest;
	}
	
	/**
	 * Finds k elements not already queried in the kClosest list. If less then k
	 * elements are not queried then as many as possible are returned.
	 * 
	 * @param kClosest the list of nodes to scan
	 * @param queried  the list of queried nodes
	 * @param id       the id to search for
	 * @param k        the amount of elements to be found
	 * @return the list of k not queried nodes
	 */
	public static List<Node> findBestNotQueried(List<Node> kClosest, List<Node> queried, BigInteger id, long k) {
		
		
		List<Node> kNotQueried = new ArrayList<>();
		kClosest.sort((n1, n2) ->  (n1.getId().xor(id).compareTo(n2.getId().xor(id))));
		Iterator<Node> iter = kClosest.iterator();
		while (k >= 0 && iter.hasNext()) {
			// I loop until I find either k elements or the collection is over
			Node next = iter.next();
			if (!queried.contains(next)) {
				// I do not add duplicates
				kNotQueried.add(next);
				k--;
			}

		}
		return kNotQueried;

	}
	
	/**
	 * Finds all the elements left to be queried in the kClosest list.
	 * 
	 * @param kClosest the list of nodes to scan
	 * @param queried  the list of queried nodes
	 * @return the list of not queried nodes
	 */
	public static List<Node> getAllNotQueried(List<Node> kClosest, List<Node> queried) {
		
		// This method simply returns all the not queried elements in the kClosest list
		List<Node> notQueried = new ArrayList<>();
		Iterator<Node> iter = kClosest.iterator();
		while (iter.hasNext()) {
			Node next = iter.next();
			if (!queried.contains(next))
				notQueried.add(next);

		}
		return notQueried;

	}

	/**
	 * Builds a random id such that the distance between nodeId and the generated one falls into
	 * the bucket passed as parameter for the routing table of nodeId
	 * @param bucket the requested bucket for the new id to fall into
	 * @param nodeId the nodeId issuing the request
	 * @return the new random ID
	 */
	public static BigInteger generateIDInRightBucket(int bucket, BigInteger nodeId) {
		
		// What I need to do is keep the prefix identical, swap the bucket level bit and
		// apply a random mask to the next bits, this way I'm sure that the element
		// will go in the right bucket
		BigInteger result = nodeId.shiftRight(bucket);
		result = result.flipBit(0);
		result = result.shiftLeft(bucket);
		
		// I generate a random delay distributed in [0, 2^bucket)
		result = result.add(new BigInteger(bucket, rand));
		
		return result;
	}

	/**
	 * This method generates a new node, by creating a random IP address, calculating its sha1
	 * function. This output value is a 160 bits value, but my identifier space is [0, 2^m)
	 * So this method makes the modulo 2^m in order to obtain a value in the correct range
	 * @param m the m system wide parameter (number of bits of the id)
	 * @return the new generated node
	 */
	public static Node generateNewNode(long m) {
		String address = rand.nextInt(256) + "." + rand.nextInt(256) + "." + rand.nextInt(256) + "." + rand.nextInt(256);
		// Generated a new address, I SHA1 it, and compute the id (as the sha output modulo 2^m)
		
		BigInteger twoToM = BigInteger.valueOf((long) 2);
		twoToM = twoToM.pow((int) m);
		
		messageDigest.update(address.getBytes());
		byte[] output = messageDigest.digest();
		BigInteger id = new BigInteger(output); 
		id = (id.mod(twoToM));
		
		return new Node(id, address);
	}

}
